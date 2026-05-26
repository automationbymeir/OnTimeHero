# 🎨 Unified Design System

## Overview

The OnTimeHero app now has a comprehensive, unified design system that standardizes all visual elements across the application. This system ensures consistency, maintainability, and a beautiful user experience.

## 📁 Files Created

### 1. `src/styles/theme.js`
The main design system file containing:
- **Colors**: Complete color palette with dynamic backgrounds
- **Typography**: Font sizes, weights, and text styles
- **Spacing**: Consistent spacing values
- **BorderRadius**: Standard border radius values
- **Shadows**: Text and card shadow definitions
- **CommonStyles**: Pre-built reusable component styles
- **Utility Functions**: Helper functions for dynamic styling

### 2. `src/styles/README.md`
Comprehensive documentation with:
- Usage examples for all design tokens
- Best practices
- Migration guide
- Design principles

### 3. `src/styles/ExampleComponent.js`
A complete reference implementation showing:
- How to use all design system components
- Best practices in action
- Visual examples of every element

## 🎯 Key Features

### Dynamic Time-Based Backgrounds
```javascript
import { getDynamicBackground, getTimeOfDay } from '../styles/theme';

const backgroundColors = getDynamicBackground();
const timeOfDay = getTimeOfDay();

<LinearGradient colors={backgroundColors} style={styles.container}>
  <Text>Current time: {timeOfDay}</Text>
</LinearGradient>
```

### Glass-Morphism Design
All UI elements use semi-transparent backgrounds:
```javascript
import { Colors, CommonStyles } from '../styles/theme';

// Pre-built glass card
<View style={CommonStyles.card}>
  <Text>Content</Text>
</View>

// Custom glass card
<View style={{ 
  backgroundColor: Colors.glass.white20,
  borderColor: Colors.glass.white30,
  borderWidth: 1 
}} />
```

### Text Visibility
Every text element has shadows for perfect readability:
```javascript
import { getTextShadow, getStrongTextShadow } from '../styles/theme';

<Text style={[styles.heading, getStrongTextShadow()]}>
  Heading
</Text>
<Text style={[styles.body, getTextShadow()]}>
  Body text
</Text>
```

### Color System
```javascript
import { Colors } from '../styles/theme';

// Glass-morphism colors
Colors.glass.white20  // 20% white
Colors.glass.white30  // 30% white

// Status colors
Colors.status.success.transparent  // Green tint
Colors.status.warning.transparent  // Orange tint
Colors.status.danger.transparent   // Red tint

// Accent colors
Colors.accent.gold.transparent     // Gold tint
```

### Typography System
```javascript
import { Typography } from '../styles/theme';

<Text style={Typography.h1}>Heading 1</Text>
<Text style={Typography.h2}>Heading 2</Text>
<Text style={Typography.body}>Body text</Text>
<Text style={Typography.caption}>Small text</Text>

// Or use individual values
<Text style={{ 
  fontSize: Typography.size.lg,
  fontWeight: Typography.weight.bold 
}} />
```

### Spacing System
```javascript
import { Spacing } from '../styles/theme';

<View style={{ 
  padding: Spacing.lg,      // 20px
  marginTop: Spacing.md,    // 12px
  gap: Spacing.sm           // 8px
}} />
```

## 📋 Quick Reference

### Colors
- `Colors.glass.white20` - Semi-transparent white (20%)
- `Colors.text.primary` - White text (#fff)
- `Colors.status.success.transparent` - Green tint
- `Colors.status.warning.transparent` - Orange tint
- `Colors.status.danger.transparent` - Red tint

### Spacing
- `xs: 4px` | `sm: 8px` | `md: 12px` | `base: 15px`
- `lg: 20px` | `xl: 24px` | `xxl: 32px` | `xxxl: 40px`

### Border Radius
- `sm: 8px` | `md: 10px` | `base: 12px` | `lg: 15px`
- `xl: 20px` | `xxl: 25px` | `round: 999px`

### Typography
- Font sizes: `xs: 10px` → `huge: 32px`
- Weights: `regular`, `medium`, `semibold`, `bold`
- Styles: `h1`, `h2`, `h3`, `h4`, `h5`, `body`, `caption`, `button`

## 🔄 Migration Examples

### Before (Old Style)
```javascript
const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  }
});
```

### After (Theme System)
```javascript
import { CommonStyles, Typography, getStrongTextShadow } from '../styles/theme';

// Use pre-built styles
<View style={CommonStyles.card}>
  <Text style={[Typography.h3, getStrongTextShadow()]}>
    Title
  </Text>
</View>
```

### Component Migration Example

**Before:**
```javascript
<View style={{
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  borderRadius: 15,
  padding: 20
}}>
  <Text style={{ 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#fff' 
  }}>
    Hello
  </Text>
</View>
```

**After:**
```javascript
import { CommonStyles, Typography, getStrongTextShadow } from '../styles/theme';

<View style={CommonStyles.card}>
  <Text style={[Typography.h5, getStrongTextShadow()]}>
    Hello
  </Text>
</View>
```

## 🎨 Design Principles

### 1. Glass-Morphism
- All cards: 10-30% white opacity
- All borders: 30-40% white opacity
- Always use subtle borders for definition

### 2. Dynamic Backgrounds
- Background changes based on time of day
- 8 different time periods with unique colors
- Use `getDynamicBackground()` for all screens

### 3. Text Visibility
- **Standard shadow**: Body text, labels
- **Strong shadow**: Headings, important text
- Never use text without shadows

### 4. Color Semantics
- **Green**: Success, on-time, positive
- **Orange/Yellow**: Warning, late, caution
- **Red**: Danger, urgent, critical
- **Blue**: Info, neutral
- **Gold**: Achievements, rewards

### 5. Spacing Consistency
- Use theme spacing values only
- No arbitrary numbers (no `padding: 17`)
- Consistent gaps create rhythm

## 📦 Pre-Built Components

### Cards
```javascript
CommonStyles.card           // Standard glass card
CommonStyles.cardSmall      // Smaller padding
CommonStyles.cardLarge      // Larger with more prominence
```

### Buttons
```javascript
CommonStyles.button         // Standard transparent button
CommonStyles.buttonPrimary  // Solid white button for primary actions
CommonStyles.iconButton     // Small icon-only button
```

### Badges
```javascript
CommonStyles.badge          // Default badge
CommonStyles.statusSuccess  // Green badge
CommonStyles.statusWarning  // Orange badge
CommonStyles.statusDanger   // Red badge
```

### Layout
```javascript
CommonStyles.row            // Horizontal layout
CommonStyles.rowBetween     // Space between items
CommonStyles.rowCenter      // Centered items
CommonStyles.container      // Full screen container
CommonStyles.scrollContent  // Scroll view padding
```

## 🚀 Best Practices

1. **Always import theme first**: Don't hardcode values
   ```javascript
   import Theme, { Colors, Typography, CommonStyles } from '../styles/theme';
   ```

2. **Use CommonStyles**: Leverage pre-built components
   ```javascript
   <View style={CommonStyles.card} />
   ```

3. **Apply text shadows**: Every text needs visibility
   ```javascript
   <Text style={[styles.text, getTextShadow()]} />
   ```

4. **Dynamic backgrounds**: Every screen should have them
   ```javascript
   const backgroundColors = getDynamicBackground();
   <LinearGradient colors={backgroundColors} />
   ```

5. **Semantic colors**: Use meaning, not appearance
   ```javascript
   // Good: Colors.status.success.transparent
   // Bad:  Colors.green
   ```

6. **Consistent spacing**: Use theme values
   ```javascript
   // Good: padding: Spacing.lg
   // Bad:  padding: 20
   ```

## 🔧 Utility Functions

### `getDynamicBackground()`
Returns time-based gradient colors array

### `getTimeOfDay()`
Returns current time period label

### `getTextShadow()`
Returns standard text shadow object

### `getStrongTextShadow()`
Returns strong text shadow for headings

### `createGlassCard(opacity, borderOpacity)`
Creates custom glass card style

### `createStatusCard(status)`
Creates status-colored glass card

## 📱 Implementation Status

### ✅ Completed
- ✅ Theme system created
- ✅ Documentation written
- ✅ Example component created
- ✅ DashboardScreen updated
- ✅ NextEventCard updated
- ✅ CalendarScreen updated
- ✅ All dashboard widgets updated

### 🔄 To Migrate
- AddEventScreen
- EditEventScreen
- ProfileScreen
- SettingsScreen
- Other remaining screens

## 🎓 Learning Resources

1. **View the example**: Check `src/styles/ExampleComponent.js`
2. **Read the docs**: See `src/styles/README.md`
3. **Study migrations**: Look at updated Dashboard and Calendar screens
4. **Experiment**: Try the utility functions

## 🤝 Contributing

When adding new components:
1. Use theme values exclusively
2. Add text shadows to all text
3. Use glass-morphism for cards
4. Follow naming conventions
5. Document any new patterns

## 📊 Benefits

- ✨ **Consistency**: Same look and feel everywhere
- 🚀 **Faster Development**: Pre-built components
- 🎨 **Easy Theming**: Change once, update everywhere
- 📱 **Better UX**: Professional, polished design
- 🔧 **Maintainable**: Single source of truth
- 🌈 **Beautiful**: Dynamic, time-based aesthetics

---

**Ready to use!** Import the theme and start building beautiful, consistent interfaces! 🎉

