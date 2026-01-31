import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { UserProfile } from "../../constants/types";
import Colors from "../../constants/Colors";
import { auth, db } from "../../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useWorkoutContext } from "../../context/WorkoutContext";

type LeaderboardUser = UserProfile & {
  score: number;
  rank: number;
  payment: number;
  deficit: number;
  potential: number;
};

const DINNER_PRICE = 320;

const getMelbourneDateComponents = () => {
  const now = new Date();
  const isoDate = now.toLocaleDateString("en-CA", {
    timeZone: "Australia/Melbourne",
  });
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day, isoDate };
};

// --- SKELETON COMPONENT ---
const SkeletonCard = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.rankContainer}>
        <View style={[styles.skeletonText, { width: 20, height: 20 }]} />
      </View>
      <View
        style={[
          styles.avatar,
          { backgroundColor: Colors.border, borderWidth: 0 },
        ]}
      />
      <View style={styles.infoContainer}>
        <View
          style={[
            styles.skeletonText,
            { width: "60%", height: 14, marginBottom: 8 },
          ]}
        />
        <View
          style={[
            styles.scoreRow,
            { backgroundColor: "rgba(0,0,0,0.05)", opacity: 0.5 },
          ]}
        >
          <View style={{ width: 60, height: 10 }} />
        </View>
      </View>
      <View style={styles.paymentContainer}>
        <View style={[styles.skeletonText, { width: 40, height: 20 }]} />
      </View>
    </Animated.View>
  );
};

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { isActive } = useWorkoutContext();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [splitMode, setSplitMode] = useState<"friendly" | "motivational">(
    "friendly",
  );
  const [totalPool, setTotalPool] = useState(0);

  const calculateLeaderboard = async () => {
    try {
      const [users, posts, configSnap] = await Promise.all([
        WorkoutRepository.getAllUsers(),
        WorkoutRepository.getPosts(),
        getDoc(doc(db, "game_state", "weekly_config")),
      ]);

      let weeklyCap = 4;
      if (configSnap.exists()) {
        weeklyCap = configSnap.data().cap || 4;
      }

      const {
        year,
        month,
        day,
        isoDate: todayString,
      } = getMelbourneDateComponents();
      const melbDateObj = new Date(year, month - 1, day);
      const currentDayOfWeek = melbDateObj.getDay();
      const daysLeftInWeek = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek;

      const scores: Record<string, number> = {};
      const postedTodayMap: Record<string, boolean> = {};

      users.forEach((u) => {
        scores[u.uid] = 0;
        postedTodayMap[u.uid] = false;
      });

      posts.forEach((post) => {
        if (scores[post.authorId] !== undefined) {
          scores[post.authorId]++;
          const pDate = new Date(post.createdAt);
          const pIso = pDate.toLocaleDateString("en-CA", {
            timeZone: "Australia/Melbourne",
          });
          if (pIso === todayString) {
            postedTodayMap[post.authorId] = true;
          }
        }
      });

      let rankedUsers: LeaderboardUser[] = users.map((u) => {
        const currentScore = scores[u.uid] || 0;
        const hasPostedToday = postedTodayMap[u.uid];
        const remainingSlots = hasPostedToday
          ? daysLeftInWeek - 1
          : daysLeftInWeek;
        const potential = Math.min(weeklyCap, currentScore + remainingSlots);

        return {
          ...u,
          score: currentScore,
          potential: potential,
          rank: 0,
          payment: 0,
          deficit: 0,
        };
      });

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
          const gap = (secondLast?.score || 0) - lastPlace.score;
          const isMotivational = gap >= 20;

          // Force motivational for testing or logic as per your snippet
          setSplitMode("motivational");
          winners.forEach((u) => (u.payment = 0));

          if (isMotivational || true) {
            // Logic preservation
            let totalDeficit = 0;
            losers.forEach((u) => {
              u.deficit = topScore - u.score;
              totalDeficit += u.deficit;
            });
            if (totalDeficit > 0) {
              losers.forEach(
                (u) => (u.payment = (u.deficit / totalDeficit) * totalCost),
              );
            }
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
          <Image
            source={item.photoURL}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
            cachePolicy="disk"
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarLetter}>{item.displayName?.[0]}</Text>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>{item.displayName.toUpperCase()}</Text>

          <View style={styles.scoreRow}>
            <View style={styles.currentScoreBox}>
              <Text style={styles.scoreValue}>{item.score}</Text>
              <Text style={styles.scoreLabel}>PTS</Text>
            </View>

            <View style={styles.dividerLine} />

            <View style={styles.potentialBox}>
              <Text style={styles.potentialLabel}>CEILING</Text>
              <Text style={styles.potentialValue}>{item.potential}</Text>
            </View>
          </View>
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
    <View style={[styles.container, { paddingTop: isActive ? 0 : insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>DINNER COMP</Text>
          <Text style={styles.title}>Leaderboard</Text>
        </View>
        <View style={styles.poolBadge}>
          {loading ? (
            <View
              style={[
                styles.skeletonText,
                { width: 40, height: 22, backgroundColor: Colors.border },
              ]}
            />
          ) : (
            <>
              <Text style={styles.poolValue}>${totalPool}</Text>
              <Text style={styles.poolLabel}>TOTAL POT</Text>
            </>
          )}
        </View>
      </View>

      {loading ? (
        <View
          style={[
            styles.modeBanner,
            {
              backgroundColor: Colors.surface,
              borderBottomColor: Colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.skeletonText,
              { width: 120, height: 14, opacity: 0.5 },
            ]}
          />
        </View>
      ) : (
        <View
          style={[
            styles.modeBanner,
            splitMode === "motivational"
              ? styles.modeMotivational
              : styles.modeFriendly,
          ]}
        >
          <View style={styles.modePrimaryRow}>
            <Ionicons
              name={splitMode === "motivational" ? "flame" : "shield-checkmark"}
              size={20}
              color={Colors.white}
            />
            <Text style={styles.modeText}>
              {splitMode === "motivational"
                ? "MOTIVATIONAL SPLIT"
                : "FRIENDLY SPLIT 🤝"}
            </Text>
          </View>
          {splitMode === "motivational" && (
            <Text style={styles.modeSubtext}>(THEIR FUCKED)</Text>
          )}
        </View>
      )}

      <FlatList
        data={(loading ? [1, 2, 3, 4, 5] : leaderboardData) as any}
        keyExtractor={(item, index) => (loading ? index.toString() : item.uid)}
        renderItem={loading ? () => <SkeletonCard /> : renderItem}
        contentContainerStyle={styles.listContent}
        scrollEnabled={!loading}
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
          !loading ? (
            <Text style={styles.footerText}>
              Based on ${DINNER_PRICE} per person. Top player pays $0.
              {splitMode === "motivational"
                ? "\n(Loser is >20pts behind. Cost split by deficit.)"
                : "\n(Friendly mode active. Cost split inversely by score.)"}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonText: {
    backgroundColor: Colors.border,
    borderRadius: 4,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 6,
    alignSelf: "flex-start",
    gap: 10,
  },
  currentScoreBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  scoreValue: {
    fontSize: 9,
    fontWeight: "900",
    color: Colors.text,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: Colors.textMuted,
  },
  dividerLine: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
  },
  potentialBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  potentialLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  potentialValue: {
    fontSize: 9,
    fontWeight: "900",
    color: Colors.gold,
  },
  nameText: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  paymentLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1,
  },
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
    minWidth: 80,
    justifyContent: "center",
  },
  poolLabel: { fontSize: 8, fontWeight: "800", color: Colors.textMuted },
  poolValue: { fontSize: 18, fontWeight: "900", color: Colors.gold },
  modeBanner: {
    margin: 16,
    padding: 12,
    borderRadius: 15,
    flexDirection: "column", // Stacked vertically
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 4,
    minHeight: 45,
  },
  modePrimaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  modeSubtext: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 10,
    opacity: 0.9,
    marginTop: 2,
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
  paymentContainer: { alignItems: "flex-end", minWidth: 60 },
  paymentAmount: { fontSize: 20, fontWeight: "900", color: Colors.text },
  footerText: {
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    paddingBottom: 40,
    paddingTop: 10,
  },
});
