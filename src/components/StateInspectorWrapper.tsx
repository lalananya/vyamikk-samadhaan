import React, { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import StateInspector from "./StateInspector";
import { useTripleTap } from "../hooks/useTripleTap";

interface StateInspectorWrapperProps {
  children: React.ReactNode;
  headerComponent?: React.ReactNode;
}

const StateInspectorWrapper: React.FC<StateInspectorWrapperProps> = ({
  children,
  headerComponent,
}) => {
  const [inspectorVisible, setInspectorVisible] = useState(false);

  const { handleTap } = useTripleTap({
    onTripleTap: () => {
      if (__DEV__) {
        console.log("🔍 State Inspector: Triple tap detected");
        setInspectorVisible(true);
      }
    },
  });

  return (
    <View style={{ flex: 1 }}>
      {children}

      {/* Invisible overlay for triple tap detection */}
      {__DEV__ && (
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 60, // Header area
            zIndex: 1000,
          }}
          onPress={handleTap}
          activeOpacity={1}
        />
      )}

      <StateInspector
        visible={inspectorVisible}
        onClose={() => setInspectorVisible(false)}
      />
    </View>
  );
};

export default StateInspectorWrapper;
