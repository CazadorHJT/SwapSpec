import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useBuilds } from "@/hooks/use-builds";
import { colors, spacing, fontSize, radius } from "@/lib/theme";
import { Plus } from "lucide-react-native";
import type { Build } from "@/lib/types";

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { data, loading } = useBuilds();

  const recentBuilds = data?.builds.slice(0, 5) ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{data?.total ?? "—"}</Text>
          <Text style={styles.statLabel}>Builds</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{user?.account_type === "professional" ? "Pro" : "Free"}</Text>
          <Text style={styles.statLabel}>Account</Text>
        </View>
      </View>

      {/* Recent builds */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Builds</Text>
          <TouchableOpacity onPress={() => router.push("/(app)/builds")}>
            <Text style={styles.sectionLink}>View all</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <Text style={styles.muted}>Loading…</Text>
        )}

        {!loading && recentBuilds.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No builds yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first engine swap build to get started.
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push("/(app)/builds/new")}
            >
              <Plus color={colors.primaryForeground} size={16} />
              <Text style={styles.ctaButtonText}>New Build</Text>
            </TouchableOpacity>
          </View>
        )}

        {recentBuilds.map((build: Build) => (
          <TouchableOpacity
            key={build.id}
            style={styles.buildCard}
            onPress={() => router.push(`/(app)/builds/${build.id}`)}
          >
            <Text style={styles.buildId}>Build #{build.id.slice(0, 8)}</Text>
            <View style={[styles.badge, build.status === "complete" ? styles.badgeComplete : styles.badgeDraft]}>
              <Text style={styles.badgeText}>{build.status}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { label: "New Build", route: "/(app)/builds/new" },
            { label: "Browse Vehicles", route: "/(app)/vehicles" },
            { label: "Browse Engines", route: "/(app)/engines" },
            { label: "Transmissions", route: "/(app)/transmissions" },
          ].map(({ label, route }) => (
            <TouchableOpacity
              key={label}
              style={styles.actionCard}
              onPress={() => router.push(route as never)}
            >
              <Text style={styles.actionLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.text,
  },
  email: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  logoutText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
  },
  statNumber: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
  },
  sectionLink: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  muted: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
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
    marginBottom: spacing.lg,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  ctaButtonText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
  buildCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  buildId: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.text,
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
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionCard: {
    width: "47%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.text,
  },
});
