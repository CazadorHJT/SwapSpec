import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useBuildExport } from "@/hooks/use-builds";
import { useApi } from "@/hooks/use-api";
import * as api from "@/lib/api-client";
import { colors, spacing, fontSize, radius } from "@/lib/theme";
import { ChevronLeft, Send } from "lucide-react-native";
import type { ChatMessageResponse } from "@/lib/types";

type Tab = "overview" | "advisor";

export default function BuildDetailScreen() {
  const { buildId } = useLocalSearchParams<{ buildId: string }>();
  const { data: exportData, loading } = useBuildExport(buildId);
  const { data: historyData, refetch: refetchHistory } = useApi(
    () => api.getChatHistory(buildId),
    [buildId],
  );

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function sendMessage() {
    if (!message.trim() || sending) return;
    const text = message.trim();
    setMessage("");
    setSending(true);
    try {
      await api.sendAdvisorMessage({ build_id: buildId, message: text });
      refetchHistory();
    } catch {
      // show error state later
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  const { build, vehicle, engine, transmission } = exportData ?? {};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>Build #{buildId.slice(0, 8)}</Text>
        <View
          style={[
            styles.badge,
            build?.status === "complete"
              ? styles.badgeComplete
              : styles.badgeDraft,
          ]}
        >
          <Text style={styles.badgeText}>{build?.status ?? "draft"}</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(["overview", "advisor"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <ScrollView contentContainerStyle={styles.content}>
          {vehicle && (
            <Section title="Vehicle">
              <Row
                label="Year / Make / Model"
                value={`${(vehicle as Record<string, unknown>).year} ${(vehicle as Record<string, unknown>).make} ${(vehicle as Record<string, unknown>).model}`}
              />
              {(vehicle as Record<string, unknown>).trim && (
                <Row
                  label="Trim"
                  value={String((vehicle as Record<string, unknown>).trim)}
                />
              )}
            </Section>
          )}
          {engine && (
            <Section title="Engine">
              <Row
                label="Make / Model"
                value={`${(engine as Record<string, unknown>).make} ${(engine as Record<string, unknown>).model}`}
              />
              {(engine as Record<string, unknown>).power_hp && (
                <Row
                  label="Power"
                  value={`${(engine as Record<string, unknown>).power_hp} hp`}
                />
              )}
              {(engine as Record<string, unknown>).torque_lb_ft && (
                <Row
                  label="Torque"
                  value={`${(engine as Record<string, unknown>).torque_lb_ft} lb-ft`}
                />
              )}
              {(engine as Record<string, unknown>).displacement_liters && (
                <Row
                  label="Displacement"
                  value={`${(engine as Record<string, unknown>).displacement_liters}L`}
                />
              )}
            </Section>
          )}
          {transmission && (
            <Section title="Transmission">
              <Row
                label="Make / Model"
                value={`${(transmission as Record<string, unknown>).make} ${(transmission as Record<string, unknown>).model}`}
              />
              {(transmission as Record<string, unknown>).trans_type && (
                <Row
                  label="Type"
                  value={String(
                    (transmission as Record<string, unknown>).trans_type,
                  )}
                />
              )}
              {(transmission as Record<string, unknown>).drivetrain_type && (
                <Row
                  label="Drivetrain"
                  value={
                    (transmission as Record<string, unknown>)
                      .drivetrain_type === "4WD"
                      ? "4WD (transfer case)"
                      : String(
                          (transmission as Record<string, unknown>)
                            .drivetrain_type,
                        )
                  }
                />
              )}
              {(transmission as Record<string, unknown>).gear_count && (
                <Row
                  label="Gears"
                  value={String(
                    (transmission as Record<string, unknown>).gear_count,
                  )}
                />
              )}
            </Section>
          )}
        </ScrollView>
      )}

      {/* Advisor tab */}
      {activeTab === "advisor" && (
        <View style={styles.advisorContainer}>
          <ScrollView
            style={styles.chatScroll}
            contentContainerStyle={styles.chatContent}
          >
            {(historyData?.messages ?? []).map((msg: ChatMessageResponse) => (
              <View
                key={msg.id}
                style={[
                  styles.bubble,
                  msg.role === "user"
                    ? styles.bubbleUser
                    : styles.bubbleAssistant,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    msg.role === "user"
                      ? styles.bubbleTextUser
                      : styles.bubbleTextAssistant,
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
            ))}
            {historyData?.messages.length === 0 && (
              <Text style={styles.advisorHint}>
                Ask the AI advisor anything about your build — fitment, wiring,
                mounts, and more.
              </Text>
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.chatInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Ask the advisor…"
              placeholderTextColor={colors.textSubtle}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!message.trim() || sending) && styles.sendBtnDisabled,
              ]}
              onPress={sendMessage}
              disabled={!message.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator
                  color={colors.primaryForeground}
                  size="small"
                />
              ) : (
                <Send color={colors.primaryForeground} size={18} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.card}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={sectionStyles.row}>
      <Text style={sectionStyles.label}>{label}</Text>
      <Text style={sectionStyles.value}>{value}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  title: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  label: { fontSize: fontSize.sm, color: colors.textMuted, flex: 1 },
  value: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 4, marginRight: 4 },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeDraft: { backgroundColor: colors.accent },
  badgeComplete: { backgroundColor: colors.success },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "500",
    color: colors.text,
    textTransform: "capitalize",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.text,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: "500",
  },
  tabTextActive: { color: colors.text },
  content: { padding: spacing.md },
  advisorContainer: { flex: 1 },
  chatScroll: { flex: 1 },
  chatContent: { padding: spacing.md, gap: spacing.sm },
  advisorHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  bubble: {
    maxWidth: "85%",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.surfaceElevated,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: fontSize.sm, lineHeight: 20 },
  bubbleTextUser: { color: colors.primaryForeground },
  bubbleTextAssistant: { color: colors.text },
  inputRow: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
