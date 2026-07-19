import React, { useState } from "react";
import {
  View,
  Image,
  Pressable,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants";

interface Props {
  onImageSelected?: (uri: string) => void;
}

const ProfileImagePicker = ({ onImageSelected }: Props) => {
  const [imageUri, setImageUri] = useState<string | null>(null);

  const handlePickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow gallery permission.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;

        setImageUri(uri);

        onImageSelected?.(uri);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.imageContainer} onPress={handlePickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="person-outline" size={80} color={colors.primary} />
          </View>
        )}

        <View style={styles.editButton}>
          <Ionicons name="pencil" size={16} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
};

export default ProfileImagePicker;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 5,
  },

  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F3F5FF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
    borderWidth: 2,
    borderColor: colors.primary,
  },

  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },

  image: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },

  editButton: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 30,
    height: 30,
    borderRadius: 17,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
