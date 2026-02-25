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
import { useEngines } from "@/hooks/use-engines";
import { colors, spacing, fontSize, radius } from "@/lib/theme";
import type { Engine } from "@/lib/types";

export default function EnginesScreen() {
  const [make, setMake] = useState("");
  const { data, loading, error, refetch } = useEngines({ make: make || undefined });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Engines</Text>
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
          data={data?.engines ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No engines found.</Text>
          }
          renderItem={({ item }: { item: Engine }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.make} {item.model}
                {item.variant ? ` ${item.variant}` : ""}
              </Text>
              <View style={styles.specRow}>
                {item.power_hp && (
                  <SpecChip label={`${item.power_hp} hp`} />
                )}
                {item.torque_lb_ft && (
                  <SpecChip label={`${item.torque_lb_ft} lb-ft`} />
                )}
                {item.displacement_liters && (
                  <SpecChip label={`${item.displacement_liters}L`} />
                )}
                {item.weight && (
                  <SpecChip label={`${item.weight} lbs`} />
                )}
              </View>
              {item.valve_train && (
                <Text style={styles.cardMeta}>{item.valve_train}</Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

function SpecChip({ label }: { label: string }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.text}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  text: { fontSize: fontSize.xs, color: colors.text, fontWeight: "500" },
});

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
  cardTitle: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text, marginBottom: spacing.xs },
  cardMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  specRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
});
