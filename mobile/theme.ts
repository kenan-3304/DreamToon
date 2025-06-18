import { extendTheme } from "native-base";

const theme = extendTheme({
  colors: {
    background: { 500: "#1A153A" }, // deep navy-purple
    ring: { 500: "#8A46FF" }, // bright purple glow
    text: { 500: "#FFFFFF" }, // off-white
  },
});

export default theme;
