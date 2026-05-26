/**
 * Example Component - Demonstrates how to use the unified theme system
 * 
 * This is a reference component showing best practices for using
 * the OnTimeHero design system.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import theme components
import Theme, {
  Colors,
  Typography,
  Spacing,
  CommonStyles,
  getTextShadow,
  getStrongTextShadow,
  getDynamicBackground,
  getTimeOfDay,
  createGlassCard,
  createStatusCard,
} from './theme';

const ExampleComponent = ({ navigation }) => {
  // Get dynamic background colors
  const backgroundColors = getDynamicBackground();
  const timeOfDay = getTimeOfDay();

  return (
    <View style={CommonStyles.container}>
      {/* Dynamic Gradient Background */}
      <LinearGradient colors={backgroundColors} style={CommonStyles.container}>
        
        {/* Header */}
        <View style={CommonStyles.header}>
          <Text style={[CommonStyles.headerTitle, getStrongTextShadow()]}>
            Example Screen
          </Text>
          <Text style={[Typography.caption, getTextShadow()]}>
            Current time: {timeOfDay}
          </Text>
        </View>

        {/* Scrollable Content */}
        <ScrollView style={CommonStyles.container} contentContainerStyle={CommonStyles.scrollContent}>
          
          {/* Section Title */}
          <Text style={[CommonStyles.sectionTitle, getStrongTextShadow()]}>
            Glass Cards
          </Text>

          {/* Standard Glass Card */}
          <View style={CommonStyles.card}>
            <Text style={[Typography.h5, getStrongTextShadow()]}>
              Standard Card
            </Text>
            <Text style={[Typography.body, getTextShadow(), { marginTop: Spacing.sm }]}>
              This is a standard glass-morphism card with 20% opacity.
            </Text>
          </View>

          {/* Custom Glass Card */}
          <View style={[createGlassCard(0.25, 0.4), { marginTop: Spacing.md }]}>
            <Text style={[Typography.h5, getStrongTextShadow()]}>
              Custom Glass Card
            </Text>
            <Text style={[Typography.body, getTextShadow(), { marginTop: Spacing.sm }]}>
              This card uses 25% opacity with custom border.
            </Text>
          </View>

          {/* Status Cards Section */}
          <Text style={[CommonStyles.sectionTitle, getStrongTextShadow(), { marginTop: Spacing.xl }]}>
            Status Cards
          </Text>

          <View style={[CommonStyles.rowBetween, { gap: Spacing.sm }]}>
            {/* Success Card */}
            <View style={[createStatusCard('success'), { flex: 1 }]}>
              <Icon name="check-circle" size={24} color={Colors.text.primary} />
              <Text style={[Typography.caption, getTextShadow(), { marginTop: Spacing.xs }]}>
                Success
              </Text>
            </View>

            {/* Warning Card */}
            <View style={[createStatusCard('warning'), { flex: 1 }]}>
              <Icon name="warning" size={24} color={Colors.text.primary} />
              <Text style={[Typography.caption, getTextShadow(), { marginTop: Spacing.xs }]}>
                Warning
              </Text>
            </View>

            {/* Danger Card */}
            <View style={[createStatusCard('danger'), { flex: 1 }]}>
              <Icon name="error" size={24} color={Colors.text.primary} />
              <Text style={[Typography.caption, getTextShadow(), { marginTop: Spacing.xs }]}>
                Danger
              </Text>
            </View>
          </View>

          {/* Buttons Section */}
          <Text style={[CommonStyles.sectionTitle, getStrongTextShadow(), { marginTop: Spacing.xl }]}>
            Buttons
          </Text>

          {/* Standard Button */}
          <TouchableOpacity style={CommonStyles.button}>
            <Text style={[CommonStyles.buttonText, getStrongTextShadow()]}>
              Standard Button
            </Text>
          </TouchableOpacity>

          {/* Primary Button */}
          <TouchableOpacity style={[CommonStyles.buttonPrimary, { marginTop: Spacing.md }]}>
            <Text style={CommonStyles.buttonPrimaryText}>
              Primary Button
            </Text>
          </TouchableOpacity>

          {/* Button with Icon */}
          <TouchableOpacity style={[CommonStyles.button, { marginTop: Spacing.md }]}>
            <View style={CommonStyles.rowCenter}>
              <Icon name="add-circle" size={20} color={Colors.text.primary} />
              <Text style={[CommonStyles.buttonText, getStrongTextShadow(), { marginLeft: Spacing.sm }]}>
                Button with Icon
              </Text>
            </View>
          </TouchableOpacity>

          {/* Badges Section */}
          <Text style={[CommonStyles.sectionTitle, getStrongTextShadow(), { marginTop: Spacing.xl }]}>
            Badges
          </Text>

          <View style={[CommonStyles.row, { flexWrap: 'wrap', gap: Spacing.sm }]}>
            <View style={CommonStyles.badge}>
              <Text style={CommonStyles.badgeText}>Default</Text>
            </View>
            <View style={CommonStyles.statusSuccess}>
              <Text style={CommonStyles.badgeText}>Success</Text>
            </View>
            <View style={CommonStyles.statusWarning}>
              <Text style={CommonStyles.badgeText}>Warning</Text>
            </View>
            <View style={CommonStyles.statusDanger}>
              <Text style={CommonStyles.badgeText}>Danger</Text>
            </View>
          </View>

          {/* Typography Section */}
          <Text style={[CommonStyles.sectionTitle, getStrongTextShadow(), { marginTop: Spacing.xl }]}>
            Typography
          </Text>

          <View style={CommonStyles.card}>
            <Text style={[Typography.h1, getStrongTextShadow()]}>Heading 1</Text>
            <Text style={[Typography.h2, getStrongTextShadow(), { marginTop: Spacing.sm }]}>Heading 2</Text>
            <Text style={[Typography.h3, getStrongTextShadow(), { marginTop: Spacing.sm }]}>Heading 3</Text>
            <Text style={[Typography.h4, getStrongTextShadow(), { marginTop: Spacing.sm }]}>Heading 4</Text>
            <Text style={[Typography.h5, getTextShadow(), { marginTop: Spacing.sm }]}>Heading 5</Text>
            <Text style={[Typography.bodyLarge, getTextShadow(), { marginTop: Spacing.md }]}>
              Large body text - Lorem ipsum dolor sit amet.
            </Text>
            <Text style={[Typography.body, getTextShadow(), { marginTop: Spacing.sm }]}>
              Regular body text - Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </Text>
            <Text style={[Typography.caption, getTextShadow(), { marginTop: Spacing.sm }]}>
              Caption text - Small descriptive text
            </Text>
          </View>

          {/* Icon Buttons */}
          <Text style={[CommonStyles.sectionTitle, getStrongTextShadow(), { marginTop: Spacing.xl }]}>
            Icon Buttons
          </Text>

          <View style={[CommonStyles.row, { gap: Spacing.md }]}>
            <TouchableOpacity style={CommonStyles.iconButton}>
              <Icon name="favorite" size={20} color={Colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={CommonStyles.iconButton}>
              <Icon name="share" size={20} color={Colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={CommonStyles.iconButton}>
              <Icon name="edit" size={20} color={Colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={CommonStyles.iconButton}>
              <Icon name="delete" size={20} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Empty State */}
          <Text style={[CommonStyles.sectionTitle, getStrongTextShadow(), { marginTop: Spacing.xl }]}>
            Empty State
          </Text>

          <View style={[CommonStyles.card, CommonStyles.emptyState]}>
            <Icon name="inbox" size={60} color={Colors.glass.white50} />
            <Text style={[Typography.h5, getStrongTextShadow(), { marginTop: Spacing.md }]}>
              No Items Yet
            </Text>
            <Text style={CommonStyles.emptyStateText}>
              When you add items, they will appear here.
            </Text>
          </View>

          {/* Color Palette Display */}
          <Text style={[CommonStyles.sectionTitle, getStrongTextShadow(), { marginTop: Spacing.xl }]}>
            Color Palette
          </Text>

          <View style={CommonStyles.card}>
            <View style={[CommonStyles.row, { flexWrap: 'wrap', gap: Spacing.sm }]}>
              <View style={[styles.colorSwatch, { backgroundColor: Colors.status.success.solid }]}>
                <Text style={[Typography.caption, getTextShadow()]}>Success</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: Colors.status.warning.solid }]}>
                <Text style={[Typography.caption, getTextShadow()]}>Warning</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: Colors.status.danger.solid }]}>
                <Text style={[Typography.caption, getTextShadow()]}>Danger</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: Colors.status.info.solid }]}>
                <Text style={[Typography.caption, getTextShadow()]}>Info</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: Colors.accent.gold.solid }]}>
                <Text style={[Typography.caption, getTextShadow()]}>Gold</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: Colors.accent.purple.solid }]}>
                <Text style={[Typography.caption, getTextShadow()]}>Purple</Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={CommonStyles.divider} />

          {/* Footer Note */}
          <View style={[CommonStyles.card, { marginTop: Spacing.md }]}>
            <Text style={[Typography.body, getTextShadow(), { textAlign: 'center' }]}>
              This component demonstrates all the design system elements.
              Use these patterns across the app for consistency.
            </Text>
          </View>

        </ScrollView>
      </LinearGradient>
    </View>
  );
};

// Additional custom styles (use sparingly - prefer CommonStyles)
const styles = {
  colorSwatch: {
    width: 100,
    height: 60,
    borderRadius: Theme.BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.Shadows.card.small,
  },
};

export default ExampleComponent;

