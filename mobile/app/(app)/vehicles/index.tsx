import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useVehicles } from "@/hooks/use-vehicles";
import { colors, spacing, fontSize, radius } from "@/lib/theme";
import type { Vehicle } from "@/lib/types";

export default function VehiclesScreen() {
  const [make, setMake] = useState("");
  const { data, loading, error, refetch } = useVehicles({ make: make || undefined });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vehicles</Text>
        {data && <Text style={styles.count}>{data.total} total</Text>}
      </View>

      <View style={styles.filterBar}>
        <TextInput
          style={styles.filterInput}
          value={make}
          onChangeText={setMake}
          placeholder="Filter by make…"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
        />
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
          data={data?.vehicles ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No vehicles found.</Text>
          }
          renderItem={({ item }: { item: Vehicle }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>
                  {item.year} {item.make} {item.model}
                  {item.trim ? ` ${item.trim}` : ""}
                </Text>
                <QualityBadge status={item.quality_status} />
              </View>
              {item.curb_weight_lbs && (
                <Text style={styles.cardMeta}>
                  Curb weight: {item.curb_weight_lbs} lbs
                </Text>
              )}
              {item.engine_bay_length_in && (
                <Text style={styles.cardMeta}>
                  Bay: {item.engine_bay_length_in}"L ×{" "}
                  {item.engine_bay_width_in}"W ×{" "}
                  {item.engine_bay_height_in}"H
                </Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

function QualityBadge({ status }: { status: string }) {
  const bgMap: Record<string, string> = {
    approved: colors.success,
    pending: colors.warning,
    rejected: colors.destructive,
  };
  const textMap: Record<string, string> = {
    approved: colors.successForeground,
    pending: colors.warningForeground,
    rejected: colors.destructiveForeground,
  };
  return (
    <View style={[styles.badge, { backgroundColor: bgMap[status] ?? colors.accent }]}>
      <Text style={[styles.badgeText, { color: textMap[status] ?? colors.text }]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize["2xl"], fontWeight: "700", color: colors.text },
  count: { fontSize: fontSize.sm, color: colors.textMuted },
  filterBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  errorText: { color: colors.destructiveForeground, fontSize: fontSize.sm },
  retryBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  retryText: { color: colors.text, fontSize: fontSize.sm },
  list: { padding: spacing.md, gap: spacing.sm },
  empty: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: "center", marginTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  cardTitle: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text, flex: 1, marginRight: spacing.sm },
  cardMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { fontSize: fontSize.xs, fontWeight: "500", textTransform: "capitalize" },
});
