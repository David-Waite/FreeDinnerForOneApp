import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from "react-native";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { MasterExercise } from "../../constants/types";
import Colors from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
};

export default function ExerciseAutocomplete({
  value,
  onChangeText,
  placeholder,
  style,
}: Props) {
  const [allExercises, setAllExercises] = useState<MasterExercise[]>([]);
  const [suggestions, setSuggestions] = useState<MasterExercise[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    const data = await WorkoutRepository.getMasterExercises();
    setAllExercises(data);
  };

  const handleTextChange = (text: string) => {
    onChangeText(text);
    if (text.length > 0) {
      const filtered = allExercises.filter((ex) =>
        ex.name.toLowerCase().includes(text.toLowerCase()),
      );
      if (
        filtered.length === 1 &&
        filtered[0].name.toLowerCase() === text.toLowerCase()
      ) {
        setSuggestions([]);
        setShowSuggestions(false);
      } else {
        setSuggestions(filtered);
        setShowSuggestions(true);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelect = (name: string) => {
    onChangeText(name);
    setShowSuggestions(false);
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={[styles.baseInput, style]}
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        value={value}
        onChangeText={handleTextChange}
        onBlur={() => {
          // Small delay to allow click to register
          setTimeout(() => setShowSuggestions(false), 200);
        }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionContainer}>
          {suggestions.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.suggestionItem}
              onPress={() => handleSelect(item.name)}
            >
              <Ionicons
                name="flash"
                size={14}
                color={Colors.gold}
                style={styles.itemIcon}
              />
              <Text style={styles.suggestionText}>
                {item.name.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 999, // Critical for the dropdown to sit on top
    position: "relative",
  },
  baseInput: {
    // This allows the custom editor styles to pass through while keeping fonts consistent
    fontWeight: "900",
  },
  suggestionContainer: {
    position: "absolute",
    top: "110%", // Small gap between input and list
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    // Duo 3D shadow for the dropdown
    borderBottomWidth: 5,
    borderBottomColor: Colors.border,
    shadowColor: Colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemIcon: {
    marginRight: 10,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
});
