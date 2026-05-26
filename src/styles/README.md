# OnTimeHero Design System

This directory contains the unified design system for the OnTimeHero app.

## Files

### `theme.js`
The main design system file that exports:
- **Colors**: All color palettes including dynamic backgrounds, status colors, and glass-morphism colors
- **Typography**: Font sizes, weights, and text styles
- **Spacing**: Consistent spacing values
- **BorderRadius**: Standard border radius values
- **Shadows**: Text and card shadows
- **CommonStyles**: Reusable component styles
- **Utility Functions**: Helper functions for dynamic styling

## Usage Examples

### Import the theme

```javascript
import Theme, { 
  Colors, 
  Typography, 
  Spacing, 
  CommonStyles,
  getTextShadow,
  getStrongTextShadow,
  getDynamicBackground 
} from '../styles/theme';
```

### Using Colors

```javascript
// Static colors
<View style={{ backgroundColor: Colors.glass.white20 }}>
  <Text style={{ color: Colors.text.primary }}>Hello</Text>
</View>

// Dynamic background
const backgroundColors = getDynamicBackground();
<LinearGradient colors={backgroundColors} style={styles.container} />

// Status colors
<View style={{ backgroundColor: Colors.status.success.transparent }} />
```

### Using Typography

```javascript
// Predefined text styles
<Text style={Typography.h1}>Large Heading</Text>
<Text style={Typography.body}>Body text</Text>
<Text style={Typography.caption}>Small caption</Text>

// Custom with typography values
<Text style={{ 
  fontSize: Typography.size.lg,
  fontWeight: Typography.weight.bold,
  color: Colors.text.primary 
}}>
  Custom Text
</Text>
```

### Using Spacing

```javascript
<View style={{ 
  padding: Spacing.lg,
  marginTop: Spacing.md,
  gap: Spacing.sm 
}} />
```

### Using Common Styles

```javascript
// Glass card
<View style={CommonStyles.card}>
  <Text style={CommonStyles.sectionTitle}>Title</Text>
  <Text style={[CommonStyles.body, getTextShadow()]}>Content</Text>
</View>

// Button
<TouchableOpacity style={CommonStyles.button}>
  <Text style={[CommonStyles.buttonText, getStrongTextShadow()]}>
    Click Me
  </Text>
</TouchableOpacity>

// Status badge
<View style={CommonStyles.statusSuccess}>
  <Text style={CommonStyles.badgeText}>Success</Text>
</View>
```

### Using Text Shadows

```javascript
// Standard shadow for body text
<Text style={[styles.text, getTextShadow()]}>
  Regular text with shadow
</Text>

// Strong shadow for headings
<Text style={[styles.heading, getStrongTextShadow()]}>
  Heading with strong shadow
</Text>

// Or use the shadow objects directly
<Text style={[styles.text, Theme.Shadows.text.standard]}>
  Text with shadow
</Text>
```

### Creating Custom Glass Cards

```javascript
// Custom opacity glass card
const customCard = createGlassCard(0.25, 0.35);
<View style={customCard}>
  <Text>Custom card</Text>
</View>

// Status-colored card
const successCard = createStatusCard('success');
<View style={successCard}>
  <Text>Success message</Text>
</View>
```

### Using Shadows

```javascript
// Apply card shadow
<View style={[styles.card, Theme.Shadows.card.medium]} />

// Apply text shadow to StyleSheet
const styles = StyleSheet.create({
  heading: {
    ...Typography.h3,
    ...Theme.Shadows.text.strong,
  }
});
```

## Design Principles

### 1. Glass-Morphism
All UI elements use semi-transparent backgrounds with subtle borders:
- Background opacity: 10-30%
- Border opacity: 30-40%
- White borders for definition

### 2. Dynamic Backgrounds
Backgrounds change based on time of day:
- Dawn (5-7 AM): Coral and sky blue
- Morning (7-11 AM): Sky blue and yellow
- Midday (11-3 PM): Vibrant blues
- Afternoon (3-5 PM): Golden oranges
- Sunset (5-7 PM): Purple-pink
- Dusk (7-9 PM): Deep twilight
- Night (9 PM-12 AM): Navy and slate
- Midnight (12-5 AM): Dark blues

### 3. Text Visibility
Always use text shadows for readability:
- Standard shadow: Body text
- Strong shadow: Headings and important text

### 4. Color Coding
Status colors provide visual feedback:
- Green: Success, on-time
- Orange/Yellow: Warning, late
- Red: Danger, urgent
- Blue: Info

### 5. Spacing Consistency
Use predefined spacing values:
- xs: 4px (tight spacing)
- sm: 8px (small gaps)
- md: 12px (medium gaps)
- base: 15px (standard padding)
- lg: 20px (large padding)
- xl: 24px (extra large)

## Best Practices

1. **Always import from theme**: Don't hardcode colors, spacing, or typography
2. **Use utility functions**: getDynamicBackground(), getTextShadow(), etc.
3. **Apply text shadows**: Every text element should have a shadow for visibility
4. **Use CommonStyles**: Leverage predefined component styles
5. **Status colors**: Use semantic color names (success, warning, danger)
6. **Glass-morphism**: Keep opacity between 10-30% for backgrounds
7. **Borders**: Always add subtle borders to glass elements (30-40% opacity)

## Updating the Theme

To add new styles or colors:
1. Add to the appropriate section in `theme.js`
2. Follow naming conventions (camelCase for JavaScript)
3. Document usage in this README
4. Use semantic names (e.g., 'success' not 'green')

## Migration Guide

To convert existing components to use the theme:

```javascript
// Before
<View style={{ 
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  padding: 20,
  borderRadius: 15 
}} />

// After
<View style={CommonStyles.card} />

// Or custom
<View style={{ 
  backgroundColor: Colors.glass.white20,
  padding: Spacing.lg,
  borderRadius: BorderRadius.lg 
}} />
```

