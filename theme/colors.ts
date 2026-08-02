// THM-001
// Paleta oficial de Prode San Jorge

export const lightColors = {
  primary: "#18A558",

  background: "#F5F6F7",
  surface: "#FFFFFF",

  text: {
    primary: "#111111",
    secondary: "#707070",
    inverse: "#FFFFFF",
  },

  border: "#E8E8E8",

  success: "#18A558",
  warning: "#F5A623",
  danger: "#E53935",

  match: {
    selected: "#18A558",
    unselected: "#F1F2F3",
  },
};

export const darkColors = {
  primary: "#22C76A",

  background: "#0D0D0D",
  surface: "#181818",

  text: {
    primary: "#FFFFFF",
    secondary: "#A3A3A3",
    inverse: "#111111",
  },

  border: "#2B2B2B",

  success: "#22C76A",
  warning: "#F5A623",
  danger: "#FF5A5A",

  match: {
    selected: "#22C76A",
    unselected: "#2A2A2A",
  },
};

export type AppColors = typeof lightColors;