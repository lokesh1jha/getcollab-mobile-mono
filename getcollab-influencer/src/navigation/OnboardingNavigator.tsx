import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CreatorProfileScreen from "../screens/(onboarding)/creator-profile";
import CategoryScreen from "../screens/(onboarding)/category";
import AcceptTermsScreen from "../screens/(onboarding)/terms";
const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} />
      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen name="AcceptTerms" component={AcceptTermsScreen} />
    </Stack.Navigator>
  );
}
