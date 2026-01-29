import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { UserProfile, WorkoutPost } from "../../constants/types";
import Colors from "../../constants/Colors";
import { auth } from "../../config/firebase";

type LeaderboardUser = UserProfile & {
  score: number;
  rank: number;
  payment: number;
  deficit: number; // For debugging/display
};

const DINNER_PRICE = 320;

export default function LeaderboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [splitMode, setSplitMode] = useState<"friendly" | "motivational">(
    "friendly",
  );
  const [totalPool, setTotalPool] = useState(0);

  const calculateLeaderboard = async () => {
    try {
      // 1. Fetch All Data
      const [users, posts] = await Promise.all([
        WorkoutRepository.getAllUsers(),
        WorkoutRepository.getPosts(),
      ]);

      // 2. Count Scores
      const scores: Record<string, number> = {};
      users.forEach((u) => (scores[u.uid] = 0));
      posts.forEach((post) => {
        if (scores[post.authorId] !== undefined) {
          scores[post.authorId]++;
        }
      });

      // 3. Create Ranked List
      let rankedUsers: LeaderboardUser[] = users.map((u) => ({
        ...u,
        score: scores[u.uid] || 0,
        rank: 0,
        payment: 0,
        deficit: 0,
      }));

      // Sort Descending
      rankedUsers.sort((a, b) => b.score - a.score);

      // Assign Ranks (Handle ties correctly in ranking display)
      // If two people have rank 1, the next person is rank 3
      let currentRank = 1;
      for (let i = 0; i < rankedUsers.length; i++) {
        if (i > 0 && rankedUsers[i].score < rankedUsers[i - 1].score) {
          currentRank = i + 1;
        }
        rankedUsers[i].rank = currentRank;
      }

      // 4. Calculate Payments
      const playerCount = rankedUsers.length;
      const totalCost = DINNER_PRICE * playerCount;
      setTotalPool(totalCost);

      if (playerCount > 0) {
        const topScore = rankedUsers[0].score;

        // Identify Winners (Everyone tied for first)
        const winners = rankedUsers.filter((u) => u.score === topScore);
        const losers = rankedUsers.filter((u) => u.score < topScore);

        // CASE 1: Everyone is Equal
        if (losers.length === 0) {
          // Everyone pays an equal share
          const equalShare = totalCost / playerCount;
          rankedUsers.forEach((u) => (u.payment = equalShare));
          setSplitMode("friendly"); // Default to friendly UI
        } else {
          // CASE 2: There are winners and losers
          // Determine Split Mode based on gap between last and second last
          const lastPlace = rankedUsers[playerCount - 1];
          const secondLast = rankedUsers[playerCount - 2];
          const gap = secondLast.score - lastPlace.score;
          const isMotivational = gap >= 20;

          setSplitMode(isMotivational ? "motivational" : "friendly");

          // Winners always pay $0 (unless everyone is equal, handled above)
          winners.forEach((u) => (u.payment = 0));

          if (isMotivational) {
            // --- MOTIVATIONAL SPLIT ---
            // Losers pay based on their deficit from the winner
            let totalDeficit = 0;
            losers.forEach((u) => {
              u.deficit = topScore - u.score;
              totalDeficit += u.deficit;
            });

            if (totalDeficit > 0) {
              losers.forEach((u) => {
                u.payment = (u.deficit / totalDeficit) * totalCost;
              });
            }
          } else {
            // --- FRIENDLY SPLIT ---
            // Losers pay based on inverse proportion
            let sumInverse = 0;
            losers.forEach((u) => {
              // Ensure score is at least 0.1 to avoid divide by zero
              const safeScore = Math.max(u.score, 0.1);
              sumInverse += 1 / safeScore;
            });

            losers.forEach((u) => {
              const safeScore = Math.max(u.score, 0.1);
              u.payment = (1 / safeScore / sumInverse) * totalCost;
            });
          }
        }
      }

      setLeaderboardData(rankedUsers);
    } catch (e) {
      console.error("Leaderboard calc failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      calculateLeaderboard();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    calculateLeaderboard();
  };

  const renderItem = ({ item }: { item: LeaderboardUser }) => {
    const isMe = item.uid === auth.currentUser?.uid;
    const isWinner = item.rank === 1;
    const isLast = item.rank === leaderboardData.length;

    return (
      <View style={[styles.card, isMe && styles.myCard]}>
        <View style={styles.rankContainer}>
          {isWinner ? (
            <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
          ) : (
            <Text style={styles.rankText}>#{item.rank}</Text>
          )}
        </View>

        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>{item.displayName?.[0]}</Text>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>{item.displayName}</Text>
          <Text style={styles.scoreText}>{item.score} Workouts</Text>

          {/* Debugging Text for Split Logic - Optional */}
          {/* <Text style={{fontSize: 10, color: '#999'}}>Deficit: {item.deficit}</Text> */}
        </View>

        <View style={styles.paymentContainer}>
          <Text style={styles.paymentLabel}>PAYS</Text>
          <Text
            style={[
              styles.paymentAmount,
              item.payment === 0
                ? styles.freeText
                : item.payment > 320
                  ? styles.highCost
                  : null,
            ]}
          >
            ${item.payment.toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Dinner Comp</Text>
        <View style={styles.poolBadge}>
          <Text style={styles.poolLabel}>TOTAL POT</Text>
          <Text style={styles.poolValue}>${totalPool}</Text>
        </View>
      </View>

      <View
        style={[
          styles.modeBanner,
          splitMode === "motivational"
            ? styles.modeMotivational
            : styles.modeFriendly,
        ]}
      >
        <Ionicons
          name={splitMode === "motivational" ? "flame" : "people"}
          size={20}
          color="#fff"
        />
        <Text style={styles.modeText}>
          {splitMode === "motivational"
            ? "MOTIVATIONAL SPLIT 🔥"
            : "FRIENDLY SPLIT 🤝"}
        </Text>
      </View>

      <FlatList
        data={leaderboardData}
        keyExtractor={(item) => item.uid}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={
          <Text style={styles.footerText}>
            Based on ${DINNER_PRICE} per person. Top player pays $0.
            {splitMode === "motivational"
              ? "\n(Loser is >20pts behind. Cost split by deficit.)"
              : "\n(Friendly mode active. Cost split inversely by score.)"}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: { fontSize: 24, fontWeight: "800", color: "#333" },

  poolBadge: {
    alignItems: "flex-end",
  },
  poolLabel: { fontSize: 10, fontWeight: "700", color: "#888" },
  poolValue: { fontSize: 20, fontWeight: "900", color: Colors.primary },

  modeBanner: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  modeFriendly: { backgroundColor: "#34C759" }, // Green
  modeMotivational: { backgroundColor: "#FF3B30" }, // Red
  modeText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },

  listContent: { padding: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  myCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: "#f0f9ff",
  },
  rankContainer: {
    width: 30,
    alignItems: "center",
    marginRight: 10,
  },
  rankText: { fontSize: 16, fontWeight: "700", color: "#666" },

  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarLetter: { fontSize: 20, fontWeight: "bold", color: "#fff" },

  infoContainer: { flex: 1 },
  nameText: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 2 },
  scoreText: { fontSize: 14, color: "#666" },

  paymentContainer: { alignItems: "flex-end" },
  paymentLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ccc",
    marginBottom: 2,
  },
  paymentAmount: { fontSize: 18, fontWeight: "700", color: "#333" },
  freeText: { color: "#34C759" }, // Green for $0
  highCost: { color: "#FF3B30" }, // Red for high cost

  footerText: {
    textAlign: "center",
    marginTop: 20,
    color: "#999",
    fontSize: 12,
    lineHeight: 18,
  },
});
