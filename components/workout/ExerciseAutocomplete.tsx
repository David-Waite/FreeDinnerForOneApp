import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from "react-native";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { MasterExercise } from "../../constants/types";
import Colors from "../../constants/Colors";

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
      // Don't show if the only suggestion is exactly what we typed
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
        style={style}
        placeholder={placeholder}
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
              <Text style={styles.suggestionText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 10, // Ensure suggestions float above other elements
    position: "relative",
  },
  suggestionContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 999,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionText: {
    fontSize: 16,
    color: "#333",
  },
});
