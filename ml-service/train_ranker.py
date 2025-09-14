#!/usr/bin/env python3
"""
Ranker Training Script

Trains a LightGBM binary classifier for candidate re-ranking and exports to ONNX.

Expected CSV format:
- label: 0 (negative) or 1 (positive)
- f0_sim: similarity score (0-1)
- f1_recency: recency feature (0-1, normalized)
- f2_trust: trust score (0-1, normalized)  
- f3_geo: geographic proximity (0-1, normalized)

Usage:
    python train_ranker.py --csv data.csv --out models/ranker.onnx
"""

import argparse
import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report
import lightgbm as lgb
import onnxmltools
from onnxmltools.convert.lightgbm import convert_lightgbm

def load_data(csv_path):
    """Load and validate training data"""
    print(f"Loading data from: {csv_path}")
    
    df = pd.read_csv(csv_path)
    
    # Validate required columns
    required_cols = ['label', 'f0_sim', 'f1_recency', 'f2_trust', 'f3_geo']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    print(f"Loaded {len(df)} samples")
    print(f"Positive samples: {df['label'].sum()} ({df['label'].mean():.2%})")
    
    # Check for missing values
    if df.isnull().any().any():
        print("Warning: Found missing values, filling with 0")
        df = df.fillna(0)
    
    return df

def prepare_features(df):
    """Prepare feature matrix and labels"""
    feature_cols = ['f0_sim', 'f1_recency', 'f2_trust', 'f3_geo']
    X = df[feature_cols].values
    y = df['label'].values
    
    print(f"Feature matrix shape: {X.shape}")
    print(f"Feature ranges:")
    for i, col in enumerate(feature_cols):
        print(f"  {col}: [{X[:, i].min():.3f}, {X[:, i].max():.3f}]")
    
    return X, y

def train_model(X, y, test_size=0.2, random_state=42):
    """Train LightGBM model"""
    print(f"\nSplitting data (test_size={test_size})")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )
    
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    
    # LightGBM parameters
    params = {
        'objective': 'binary',
        'metric': 'auc',
        'boosting_type': 'gbdt',
        'num_leaves': 31,
        'learning_rate': 0.1,
        'feature_fraction': 0.9,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1,
        'random_state': random_state
    }
    
    print("\nTraining LightGBM model...")
    train_data = lgb.Dataset(X_train, label=y_train)
    test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)
    
    model = lgb.train(
        params,
        train_data,
        valid_sets=[test_data],
        num_boost_round=100,
        callbacks=[lgb.early_stopping(10), lgb.log_evaluation(10)]
    )
    
    # Evaluate model
    y_pred_proba = model.predict(X_test, num_iteration=model.best_iteration)
    y_pred = (y_pred_proba > 0.5).astype(int)
    
    auc = roc_auc_score(y_test, y_pred_proba)
    print(f"\nModel Performance:")
    print(f"  AUC: {auc:.4f}")
    print(f"  Best iteration: {model.best_iteration}")
    
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    return model

def export_to_onnx(model, output_path):
    """Export LightGBM model to ONNX"""
    print(f"\nExporting model to ONNX: {output_path}")
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Convert to ONNX
    # Define input shape: [None, 4] for 4 features
    initial_type = [('input', onnxmltools.convert.common.data_types.FloatTensorType([None, 4]))]
    
    onnx_model = convert_lightgbm(
        model,
        initial_types=initial_type,
        target_opset=11
    )
    
    # Save ONNX model
    with open(output_path, 'wb') as f:
        f.write(onnx_model.SerializeToString())
    
    print(f"✅ ONNX model saved to: {output_path}")
    
    # Verify the model can be loaded
    try:
        import onnxruntime as ort
        session = ort.InferenceSession(output_path)
        print(f"✅ ONNX model verification successful")
        print(f"   Input shape: {session.get_inputs()[0].shape}")
        print(f"   Output shape: {session.get_outputs()[0].shape}")
    except Exception as e:
        print(f"⚠️  ONNX model verification failed: {e}")

def main():
    parser = argparse.ArgumentParser(description='Train ranker model')
    parser.add_argument('--csv', required=True, help='Path to training CSV file')
    parser.add_argument('--out', required=True, help='Output path for ONNX model')
    parser.add_argument('--test-size', type=float, default=0.2, help='Test set size (default: 0.2)')
    parser.add_argument('--random-state', type=int, default=42, help='Random state (default: 42)')
    
    args = parser.parse_args()
    
    try:
        # Load data
        df = load_data(args.csv)
        
        # Prepare features
        X, y = prepare_features(df)
        
        # Train model
        model = train_model(X, y, test_size=args.test_size, random_state=args.random_state)
        
        # Export to ONNX
        export_to_onnx(model, args.out)
        
        print(f"\n🎉 Training completed successfully!")
        print(f"Model saved to: {args.out}")
        
    except Exception as e:
        print(f"❌ Training failed: {e}")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())
