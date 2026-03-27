import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useBuilds } from "@/hooks/use-builds";
import { colors, spacing, fontSize, radius } from "@/lib/theme";
import { Plus } from "lucide-react-native";
import type { Build } from "@/lib/types";

export default function BuildsScreen() {
  const { data, loading, error, refetch } = useBuilds();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Builds</Text>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => router.push("/(app)/builds/new")}
        >
          <Plus color={colors.primaryForeground} size={18} />
          <Text style={styles.newButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={data?.builds ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No builds yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap "New" to plan your first engine swap.
              </Text>
            </View>
          }
          renderItem={({ item }: { item: Build }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(app)/builds/${item.id}`)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>
                  Build #{item.id.slice(0, 8)}
                </Text>
                <View
                  style={[
                    styles.badge,
                    item.status === "complete"
                      ? styles.badgeComplete
                      : styles.badgeDraft,
                  ]}
                >
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>
                Created {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.text,
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  newButtonText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  errorText: {
    color: colors.destructiveForeground,
    fontSize: fontSize.sm,
  },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  retryText: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  empty: {
    paddingTop: spacing.xxl,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.text,
  },
  cardMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeDraft: {
    backgroundColor: colors.accent,
  },
  badgeComplete: {
    backgroundColor: colors.success,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "500",
    color: colors.text,
    textTransform: "capitalize",
  },
});
