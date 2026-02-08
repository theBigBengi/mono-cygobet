/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { lightColors, darkColors } from '@/lib/theme/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

const Colors = {
  light: {
    text: lightColors.textPrimary,
    background: lightColors.background,
    tint: lightColors.primary,
    icon: lightColors.textSecondary,
    tabIconDefault: lightColors.textSecondary,
    tabIconSelected: lightColors.primary,
  },
  dark: {
    text: darkColors.textPrimary,
    background: darkColors.background,
    tint: darkColors.primary,
    icon: darkColors.textSecondary,
    tabIconDefault: darkColors.textSecondary,
    tabIconSelected: darkColors.primary,
  },
};

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
