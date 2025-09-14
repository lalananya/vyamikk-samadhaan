# Animated Intro Logo Implementation

This implementation provides a production-ready animated intro logo for "Ananya Engineered Industrial Components & Pay Systems LLP (SPECIAL)" across both mobile (Expo/React Native) and web (React) platforms.

## 🎯 Features

- **Exact Visual Fidelity**: Maintains the original SVG geometry, gradients, and timing from the source HTML
- **Cross-Platform**: Native React Native animations + Web CSS animations
- **Accessibility**: Respects `prefers-reduced-motion` and provides proper screen reader support
- **Performance**: Optimized animations using Reanimated v3 (mobile) and CSS transforms (web)
- **Brand Consistency**: Centralized design tokens and color schemes

## 📱 Mobile (Expo/React Native)

### Files Created/Modified:

- `src/theme/brand.ts` - Brand colors and design tokens
- `src/components/IntroLogo.native.tsx` - Animated logo component with Reanimated v3
- `src/screens/IntroScreen.tsx` - Full-screen intro with skip button
- `app/intro.tsx` - Expo Router page
- `app/index.tsx` - Updated to show intro first
- `babel.config.js` - Reanimated plugin configuration
- `app.json` - Status bar and splash screen configuration

### Dependencies:

All required dependencies are already installed:

- `react-native-svg` ✅
- `react-native-reanimated` ✅
- `expo-splash-screen` ✅

### How to Run:

```bash
# Start the backend (if not running)
cd server
DEV_NO_TOTP=1 node index.js

# Start Expo (in another terminal)
cd /Users/shivamsaurav/projects/vyamikk-samadhaan
npx expo start --clear
```

### Animation Details:

- **Orbital Rings**: 3 elliptical rings rotating at different speeds (30s, 22s, 35s)
- **Convergence Groups**: 3 groups of paths scaling and rotating with 1.5s delays
- **Completion Rings**: Expanding circles with fade-out effect
- **Network Nodes**: Pulsing circles with staggered delays
- **Success Indicators**: Glowing elements with brightness animation
- **Reduced Motion**: Static SVG with simple fade-in when motion is disabled

## 🌐 Web (React + Tailwind)

### Files Created:

- `apps/web/` - Complete Vite + React + Tailwind setup
- `apps/web/src/components/IntroLogoWeb.tsx` - Web version with CSS animations
- `apps/web/src/App.tsx` - Demo app with intro screen
- `public/logo.html` - Embed-only version for iframe overlays

### How to Run:

```bash
cd apps/web
npm install
npm run dev
# Opens at http://localhost:3000
```

### Animation Details:

- **CSS Keyframes**: Identical timing to mobile version
- **Responsive**: Scales properly on different screen sizes
- **Embed Support**: `/public/logo.html#animatedLogo` shows only the logo

## 🎨 Brand Integration

### Design Tokens (`src/theme/brand.ts`):

```typescript
export const brand = {
  name: "Ananya Engineered Industrial Components & Pay Systems LLP (SPECIAL)",
  bg: "#000000",
  platinumStops: [
    "#ffffff",
    "#f1f3f4",
    "#e8eaed",
    "#dadce0",
    "#bdc1c6",
    "#9aa0a6",
  ],
  completionStops: ["#ffffff", "#f0f8f0", "#e8f5e8", "#c8e6c9"],
  networkStops: ["#e0e0e0", "#f5f5f5", "#ffffff", "#e8f5e8"],
  accent: "#009245",
};
```

### Visual Elements:

- **Main Logo**: Stylized "A" with premium metal gradient
- **Orbital System**: 3 elliptical rings with pulsing network nodes
- **Convergence Paths**: 3 groups of curved paths converging to center
- **Completion Rings**: Expanding circles indicating success
- **Success Indicators**: Glowing elements around the main logo

## 🔧 Configuration

### Props API:

```typescript
type IntroLogoProps = {
  autoplay?: boolean; // default true
  durationMs?: number; // default 3000
  reducedMotion?: boolean; // override system preference
  onDone?: () => void; // callback when animation completes
  size?: number | string; // e.g., 280 or '100%'
};
```

### Navigation Flow:

1. **App Launch** → Intro Screen (3s) → Login Screen
2. **Skip Button** → Immediate navigation to Login
3. **Already Authenticated** → Skip intro, go to Dashboard

## 🚀 Production Deployment

### Mobile (Expo):

```bash
# Build for production
npx expo build:android
npx expo build:ios
```

### Web:

```bash
cd apps/web
npm run build
# Deploy dist/ folder to any static hosting
```

### Embed Usage:

```html
<!-- For iframe overlays -->
<iframe src="/logo.html#animatedLogo" width="400" height="400"></iframe>
```

## 🎭 Animation Timing

| Element             | Duration | Delay     | Easing           |
| ------------------- | -------- | --------- | ---------------- |
| Orbital Ring 1      | 30s      | 0s        | Linear           |
| Orbital Ring 2      | 22s      | 0s        | Linear (reverse) |
| Orbital Ring 3      | 35s      | 0s        | Linear           |
| Convergence Group 1 | 6s       | 0s        | Ease-in-out      |
| Convergence Group 2 | 6s       | 1.5s      | Ease-in-out      |
| Convergence Group 3 | 6s       | 3s        | Ease-in-out      |
| Completion Ring 1   | 4s       | 0s        | Ease-out         |
| Completion Ring 2   | 4s       | 1s        | Ease-out         |
| Completion Ring 3   | 4s       | 2s        | Ease-out         |
| Network Pulse       | 3s       | Staggered | Ease-in-out      |
| Success Glow        | 2.5s     | 0s        | Ease-in-out      |

## 🔍 Testing

### Mobile Testing:

1. Launch app on OnePlus 12R
2. Verify intro plays for 3 seconds
3. Test skip button functionality
4. Test reduced motion preference
5. Verify navigation to login screen

### Web Testing:

1. Open http://localhost:3000
2. Verify intro animation plays
3. Test skip button
4. Test reduced motion (browser dev tools)
5. Test embed version at `/logo.html#animatedLogo`

## 📝 Notes

- **Performance**: Animations use native drivers where possible
- **Accessibility**: Full screen reader support with proper ARIA labels
- **Responsive**: Scales properly on all screen sizes
- **Brand Compliant**: Maintains exact visual language from source
- **Production Ready**: Optimized for both development and production builds

The implementation is complete and ready for production use across both mobile and web platforms.
