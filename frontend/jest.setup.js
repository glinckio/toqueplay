jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (component) => component || View,
      View,
    },
    useSharedValue: (initialValue) => ({ value: initialValue }),
    useAnimatedStyle: (fn) => (typeof fn === "function" ? fn() : {}),
    withTiming: (toValue) => toValue,
    withSpring: (toValue) => toValue,
    withDelay: (_delay, value) => value,
    interpolateColor: () => "#000000",
    Easing: {
      bezier: () => (t) => t,
      inOut: (fn) => fn,
      ease: (t) => t,
    },
    createAnimatedComponent: (component) => component || View,
    View,
    runOnJS: (fn) => fn,
  };
});
