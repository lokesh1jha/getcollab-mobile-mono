
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import CreatorProfileScreen from '../screens/(onboarding)/creator-profile';
import CategoryScreen from '../screens/(onboarding)/category';
import ReviewProfileScreen from '../screens/(onboarding)/review-profile';
const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="CreateProfile"
        component={CreatorProfileScreen}
      />
      <Stack.Screen
        name="Category"
        component={CategoryScreen}
      />
      <Stack.Screen
        name="ReviewProfile"
        component={ReviewProfileScreen}
      />
 
    </Stack.Navigator>
  );
}