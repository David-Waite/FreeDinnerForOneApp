import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Changed import
import { useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { UserProfile } from "../../constants/types";
import Colors from "../../constants/Colors";
import { auth } from "../../config/firebase";
import { useWorkoutContext } from "../../context/WorkoutContext"; // Import Context

type LeaderboardUser = UserProfile & {
  score: number;
  rank: number;
  payment: number;
  deficit: number;
};

const DINNER_PRICE = 320;

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { isActive } = useWorkoutContext(); // Get Active State

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [splitMode, setSplitMode] = useState<"friendly" | "motivational">(
    "friendly",
  );
  const [totalPool, setTotalPool] = useState(0);

  const calculateLeaderboard = async () => {
    try {
      const [users, posts] = await Promise.all([
        WorkoutRepository.getAllUsers(),
        WorkoutRepository.getPosts(),
      ]);

      const scores: Record<string, number> = {};
      users.forEach((u) => (scores[u.uid] = 0));
      posts.forEach((post) => {
        if (scores[post.authorId] !== undefined) scores[post.authorId]++;
      });

      let rankedUsers: LeaderboardUser[] = users.map((u) => ({
        ...u,
        score: scores[u.uid] || 0,
        rank: 0,
        payment: 0,
        deficit: 0,
      }));

      rankedUsers.sort((a, b) => b.score - a.score);

      let currentRank = 1;
      for (let i = 0; i < rankedUsers.length; i++) {
        if (i > 0 && rankedUsers[i].score < rankedUsers[i - 1].score)
          currentRank = i + 1;
        rankedUsers[i].rank = currentRank;
      }

      const playerCount = rankedUsers.length;
      const totalCost = DINNER_PRICE * playerCount;
      setTotalPool(totalCost);

      if (playerCount > 0) {
        const topScore = rankedUsers[0].score;
        const winners = rankedUsers.filter((u) => u.score === topScore);
        const losers = rankedUsers.filter((u) => u.score < topScore);

        if (losers.length === 0) {
          const equalShare = totalCost / playerCount;
          rankedUsers.forEach((u) => (u.payment = equalShare));
          setSplitMode("friendly");
        } else {
          const lastPlace = rankedUsers[playerCount - 1];
          const secondLast = rankedUsers[playerCount - 2];
          const isMotivational = secondLast.score - lastPlace.score >= 20;
          setSplitMode(isMotivational ? "motivational" : "friendly");

          winners.forEach((u) => (u.payment = 0));
          if (isMotivational) {
            let totalDeficit = 0;
            losers.forEach((u) => {
              u.deficit = topScore - u.score;
              totalDeficit += u.deficit;
            });
            losers.forEach(
              (u) => (u.payment = (u.deficit / totalDeficit) * totalCost),
            );
          } else {
            let sumInverse = 0;
            losers.forEach((u) => (sumInverse += 1 / Math.max(u.score, 0.1)));
            losers.forEach(
              (u) =>
                (u.payment =
                  (1 / Math.max(u.score, 0.1) / sumInverse) * totalCost),
            );
          }
        }
      }
      setLeaderboardData(rankedUsers);
    } catch (e) {
      console.error(e);
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

  const renderItem = ({ item }: { item: LeaderboardUser }) => {
    const isMe = item.uid === auth.currentUser?.uid;
    const isWinner = item.rank === 1;

    return (
      <View style={[styles.card, isMe && styles.myCard]}>
        <View style={styles.rankContainer}>
          {isWinner ? (
            <MaterialCommunityIcons
              name="crown"
              size={28}
              color={Colors.gold}
            />
          ) : (
            <Text style={styles.rankText}>{item.rank}</Text>
          )}
        </View>

        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarLetter}>{item.displayName?.[0]}</Text>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>{item.displayName}</Text>
          <Text style={styles.scoreText}>{item.score} POINTS</Text>
        </View>

        <View style={styles.paymentContainer}>
          <Text style={styles.paymentLabel}>PAYS</Text>
          <Text
            style={[
              styles.paymentAmount,
              item.payment === 0 && { color: Colors.primary },
            ]}
          >
            ${item.payment.toFixed(0)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    // FIX: Conditional Padding
    <View style={[styles.container, { paddingTop: isActive ? 0 : insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>DINNER COMP</Text>
          <Text style={styles.title}>Leaderboard</Text>
        </View>
        <View style={styles.poolBadge}>
          <Text style={styles.poolValue}>${totalPool}</Text>
          <Text style={styles.poolLabel}>TOTAL POT</Text>
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
          name={splitMode === "motivational" ? "flame" : "shield-checkmark"}
          size={20}
          color={Colors.white}
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              calculateLeaderboard();
            }}
            tintColor={Colors.primary}
          />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.background,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  title: { fontSize: 28, fontWeight: "900", color: Colors.text },
  poolBadge: {
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 12,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
    alignItems: "center",
  },
  poolLabel: { fontSize: 8, fontWeight: "800", color: Colors.textMuted },
  poolValue: { fontSize: 18, fontWeight: "900", color: Colors.gold },
  modeBanner: {
    margin: 16,
    padding: 12,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 4,
  },
  modeFriendly: { backgroundColor: Colors.info, borderBottomColor: "#1899d6" },
  modeMotivational: {
    backgroundColor: Colors.error,
    borderBottomColor: "#d33131",
  },
  modeText: {
    color: Colors.white,
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  listContent: { padding: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 14,
    borderBottomWidth: 4,
    borderBottomColor: Colors.border,
  },
  myCard: {
    backgroundColor: "#233640",
    borderColor: Colors.primary,
    borderBottomColor: "#46a302",
    borderWidth: 2,
    borderBottomWidth: 5,
  },
  rankContainer: { width: 35, alignItems: "center", marginRight: 10 },
  rankText: { fontSize: 18, fontWeight: "900", color: Colors.textMuted },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 15,
    marginRight: 15,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: { fontSize: 22, fontWeight: "900", color: Colors.text },
  infoContainer: { flex: 1 },
  nameText: { fontSize: 17, fontWeight: "800", color: Colors.text },
  scoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
    marginTop: 2,
  },
  paymentContainer: { alignItems: "flex-end" },
  paymentLabel: { fontSize: 10, fontWeight: "800", color: Colors.placeholder },
  paymentAmount: { fontSize: 20, fontWeight: "900", color: Colors.text },
  footerContainer: { marginTop: "auto", padding: 20, alignItems: "center" },
  footerText: {
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
});
