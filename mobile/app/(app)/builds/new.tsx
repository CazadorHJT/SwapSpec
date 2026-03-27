import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import * as api from "@/lib/api-client";
import { useApi } from "@/hooks/use-api";
import { colors, spacing, fontSize, radius } from "@/lib/theme";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Search,
} from "lucide-react-native";
import type {
  Vehicle,
  Engine,
  Transmission,
  EngineFamily,
  TransmissionGroups,
  EngineIdentifySuggestion,
  TransmissionIdentifySuggestion,
} from "@/lib/types";

// ── hooks ─────────────────────────────────────────────────────────────────────
function useEngineFamilies(make?: string) {
  return useApi(() => api.getEngineFamilies(make), [make]);
}

function useTransmissionsForBuild(engineId?: string, vehicleId?: string) {
  return useApi(
    () =>
      engineId
        ? api.getTransmissionsForBuild(engineId, vehicleId)
        : Promise.resolve(null),
    [engineId, vehicleId],
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
type Step = 0 | 1 | 2 | 3;
const STEPS = ["Vehicle", "Engine", "Transmission", "Review"];

export default function NewBuildScreen() {
  const [step, setStep] = useState<Step>(0);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<Engine | null>(null);
  const [selectedTransmission, setSelectedTransmission] =
    useState<Transmission | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vehicle filter
  const [vehicleMake, setVehicleMake] = useState("");
  const vehicles = useApi(
    () => api.getVehicles({ make: vehicleMake || undefined }),
    [vehicleMake],
  );

  // Engine: family drill-down
  const [familyMakeFilter, setFamilyMakeFilter] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<EngineFamily | null>(
    null,
  );
  const families = useEngineFamilies(familyMakeFilter || undefined);

  // Add engine dialog
  const [addEngineOpen, setAddEngineOpen] = useState(false);
  const [engineQuery, setEngineQuery] = useState("");
  const [engineQueryLoading, setEngineQueryLoading] = useState(false);
  const [engineSuggestions, setEngineSuggestions] = useState<
    EngineIdentifySuggestion[]
  >([]);
  const [engineExistingId, setEngineExistingId] = useState<string | null>(null);
  const [selectedEngineSug, setSelectedEngineSug] =
    useState<EngineIdentifySuggestion | null>(null);
  const [engineDonorYear, setEngineDonorYear] = useState("");
  const [engineDonorMake, setEngineDonorMake] = useState("");
  const [engineDonorModel, setEngineDonorModel] = useState("");

  // Transmission groups
  const transGroups = useTransmissionsForBuild(
    selectedEngine?.id,
    selectedVehicle?.id,
  );

  // Add transmission dialog
  const [addTransOpen, setAddTransOpen] = useState(false);
  const [transQuery, setTransQuery] = useState("");
  const [transQueryLoading, setTransQueryLoading] = useState(false);
  const [transSuggestions, setTransSuggestions] = useState<
    TransmissionIdentifySuggestion[]
  >([]);
  const [transExistingId, setTransExistingId] = useState<string | null>(null);
  const [selectedTransSug, setSelectedTransSug] =
    useState<TransmissionIdentifySuggestion | null>(null);
  const [transDonorYear, setTransDonorYear] = useState("");
  const [transDonorMake, setTransDonorMake] = useState("");
  const [transDonorModel, setTransDonorModel] = useState("");

  async function create() {
    if (!selectedVehicle || !selectedEngine) return;
    setCreating(true);
    setError(null);
    try {
      const build = await api.createBuild({
        vehicle_id: selectedVehicle.id,
        engine_id: selectedEngine.id,
        transmission_id: selectedTransmission?.id,
      });
      router.replace(`/(app)/builds/${build.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create build.");
      setCreating(false);
    }
  }

  async function handleEngineSearch() {
    if (!engineQuery.trim()) return;
    setEngineQueryLoading(true);
    try {
      const result = await api.identifyEngine(engineQuery);
      setEngineSuggestions(result.suggestions);
      setEngineExistingId(result.existing_match_id ?? null);
    } catch {
      setError("AI identification failed.");
    } finally {
      setEngineQueryLoading(false);
    }
  }

  function handleSelectEngineSuggestion(sug: EngineIdentifySuggestion) {
    setSelectedEngineSug(sug);
    setEngineDonorYear(sug.origin_year ? String(sug.origin_year) : "");
    setEngineDonorMake(sug.origin_make ?? "");
    setEngineDonorModel(sug.origin_model ?? "");
  }

  async function handleConfirmEngineSuggestion() {
    if (!selectedEngineSug) return;
    const sug = selectedEngineSug;
    if (engineExistingId) {
      try {
        const existing = await api.getEngine(engineExistingId);
        setSelectedEngine(existing);
        setAddEngineOpen(false);
      } catch {
        setError("Failed to load engine.");
      }
      return;
    }
    try {
      const created = await api.createEngine({
        make: sug.make,
        model: sug.model,
        variant: sug.variant,
        engine_family: sug.engine_family,
        power_hp: sug.power_hp,
        torque_lb_ft: sug.torque_lb_ft,
        displacement_liters: sug.displacement_liters,
        origin_year: engineDonorYear
          ? parseInt(engineDonorYear)
          : sug.origin_year,
        origin_make: engineDonorMake || sug.origin_make,
        origin_model: engineDonorModel || sug.origin_model,
        origin_variant: sug.origin_variant,
      } as Parameters<typeof api.createEngine>[0]);
      setSelectedEngine(created);
      setAddEngineOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create engine.");
    }
  }

  async function handleTransSearch() {
    if (!transQuery.trim()) return;
    setTransQueryLoading(true);
    try {
      const result = await api.identifyTransmission(transQuery);
      setTransSuggestions(result.suggestions);
      setTransExistingId(result.existing_match_id ?? null);
    } catch {
      setError("AI identification failed.");
    } finally {
      setTransQueryLoading(false);
    }
  }

  function handleSelectTransSuggestion(sug: TransmissionIdentifySuggestion) {
    setSelectedTransSug(sug);
    setTransDonorYear(sug.origin_year ? String(sug.origin_year) : "");
    setTransDonorMake(sug.origin_make ?? "");
    setTransDonorModel(sug.origin_model ?? "");
  }

  async function handleConfirmTransSuggestion() {
    if (!selectedTransSug) return;
    const sug = selectedTransSug;
    if (transExistingId) {
      try {
        const existing = await api.getTransmission(transExistingId);
        setSelectedTransmission(existing);
        setAddTransOpen(false);
      } catch {
        setError("Failed to load transmission.");
      }
      return;
    }
    try {
      const created = await api.createTransmission({
        make: sug.make,
        model: sug.model,
        trans_type: sug.trans_type,
        gear_count: sug.gear_count,
        bellhousing_pattern: sug.bellhousing_pattern,
        drivetrain_type: sug.drivetrain_type,
        origin_year: transDonorYear
          ? parseInt(transDonorYear)
          : sug.origin_year,
        origin_make: transDonorMake || sug.origin_make,
        origin_model: transDonorModel || sug.origin_model,
        origin_variant: sug.origin_variant,
      } as Parameters<typeof api.createTransmission>[0]);
      setSelectedTransmission(created);
      setAddTransOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create transmission.",
      );
    }
  }

  const groups: TransmissionGroups | null = transGroups.data ?? null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step === 1 && selectedFamily) {
              setSelectedFamily(null);
            } else if (step === 0) {
              router.back();
            } else {
              setStep((step - 1) as Step);
            }
          }}
        >
          <ChevronLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>New Build</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
              {i < step ? (
                <Check color={colors.primaryForeground} size={12} />
              ) : (
                <Text
                  style={[styles.stepNum, i === step && styles.stepNumActive]}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            <Text
              style={[styles.stepLabel, i === step && styles.stepLabelActive]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Step 0 — Vehicle */}
      {step === 0 && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Select a Vehicle</Text>
          <TextInput
            style={styles.filter}
            value={vehicleMake}
            onChangeText={setVehicleMake}
            placeholder="Filter by make…"
            placeholderTextColor={colors.textSubtle}
          />
          {vehicles.loading && (
            <ActivityIndicator
              color={colors.text}
              style={{ marginTop: spacing.lg }}
            />
          )}
          {(vehicles.data?.vehicles ?? []).map((v: Vehicle) => (
            <SelectCard
              key={v.id}
              selected={selectedVehicle?.id === v.id}
              onPress={() => setSelectedVehicle(v)}
              title={`${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""}`}
              subtitle={
                v.stock_transmission_model
                  ? `Stock trans: ${v.stock_transmission_model}`
                  : undefined
              }
            />
          ))}
        </ScrollView>
      )}

      {/* Step 1 — Engine: family → variant drill-down */}
      {step === 1 && (
        <ScrollView contentContainerStyle={styles.content}>
          {!selectedFamily ? (
            <>
              <Text style={styles.sectionTitle}>Select an Engine Family</Text>
              <TextInput
                style={styles.filter}
                value={familyMakeFilter}
                onChangeText={setFamilyMakeFilter}
                placeholder="Filter by manufacturer…"
                placeholderTextColor={colors.textSubtle}
              />
              {families.loading && (
                <ActivityIndicator
                  color={colors.text}
                  style={{ marginTop: spacing.lg }}
                />
              )}
              {(families.data ?? []).map((fam) => (
                <FamilyCard
                  key={fam.family}
                  family={fam}
                  onPress={async () => {
                    if (fam.variants.length === 1) {
                      const eng = await api.getEngine(fam.variants[0].id);
                      setSelectedEngine(eng);
                    } else {
                      setSelectedFamily(fam);
                    }
                  }}
                />
              ))}
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {selectedFamily.family} — Pick a Variant
              </Text>
              <Text style={styles.sectionSubtitle}>{selectedFamily.make}</Text>
              {selectedFamily.variants.map((v) => (
                <SelectCard
                  key={v.id}
                  selected={selectedEngine?.id === v.id}
                  onPress={async () => {
                    const eng = await api.getEngine(v.id);
                    setSelectedEngine(eng);
                    setSelectedFamily(null);
                  }}
                  title={v.model}
                  subtitle={
                    [
                      v.variant,
                      v.power_hp ? `${v.power_hp} hp` : null,
                      v.torque_lb_ft ? `${v.torque_lb_ft} lb-ft` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                />
              ))}
            </>
          )}

          {selectedEngine && (
            <View style={styles.selectedInfo}>
              <Check color={colors.primary} size={14} />
              <Text style={styles.selectedInfoText}>
                {selectedEngine.make} {selectedEngine.model}{" "}
                {selectedEngine.variant ?? ""}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setEngineQuery("");
              setEngineSuggestions([]);
              setEngineExistingId(null);
              setAddEngineOpen(true);
            }}
          >
            <Text style={styles.addBtnText}>+ Add Different Engine</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 2 — Transmission: grouped */}
      {step === 2 && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Select a Transmission</Text>
          <Text style={styles.sectionSubtitle}>Optional</Text>

          {transGroups.loading && (
            <ActivityIndicator
              color={colors.text}
              style={{ marginTop: spacing.lg }}
            />
          )}

          {groups && (
            <>
              {/* Stock for engine */}
              {groups.stock_for_engine.length > 0 && (
                <>
                  <SectionHeader title="Stock with this engine" />
                  {groups.stock_for_engine.map((t) => (
                    <TransCard
                      key={t.id}
                      trans={t}
                      selected={selectedTransmission?.id === t.id}
                      onPress={() => setSelectedTransmission(t)}
                    />
                  ))}
                </>
              )}

              {/* Chassis original info */}
              {groups.chassis_original_label && (
                <View style={styles.chassisInfo}>
                  <Text style={styles.chassisInfoLabel}>
                    Original chassis transmission
                  </Text>
                  <Text style={styles.chassisInfoText}>
                    {selectedVehicle?.year} {selectedVehicle?.make}{" "}
                    {selectedVehicle?.model} came with:{" "}
                    <Text style={{ fontWeight: "600" }}>
                      {groups.chassis_original_label}
                    </Text>
                  </Text>
                  {groups.chassis_original.map((t) => (
                    <TransCard
                      key={t.id}
                      trans={t}
                      selected={selectedTransmission?.id === t.id}
                      onPress={() => setSelectedTransmission(t)}
                    />
                  ))}
                </View>
              )}

              {/* Other compatible */}
              {groups.other_compatible.length > 0 && (
                <>
                  <SectionHeader title="Other compatible" />
                  {groups.other_compatible.map((t) => (
                    <TransCard
                      key={t.id}
                      trans={t}
                      selected={selectedTransmission?.id === t.id}
                      onPress={() => setSelectedTransmission(t)}
                    />
                  ))}
                </>
              )}

              {/* Skip option */}
              <SelectCard
                selected={selectedTransmission === null}
                onPress={() => setSelectedTransmission(null)}
                title="Skip — no transmission"
                subtitle="You can add one later"
              />
            </>
          )}

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setTransQuery("");
              setTransSuggestions([]);
              setTransExistingId(null);
              setAddTransOpen(true);
            }}
          >
            <Text style={styles.addBtnText}>+ Add Different Transmission</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Review & Create</Text>
          <ReviewRow
            label="Vehicle"
            value={
              selectedVehicle
                ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`
                : "—"
            }
          />
          <ReviewRow
            label="Engine"
            value={
              selectedEngine
                ? `${selectedEngine.make} ${selectedEngine.model}${selectedEngine.variant ? ` ${selectedEngine.variant}` : ""}`
                : "—"
            }
          />
          <ReviewRow
            label="Transmission"
            value={
              selectedTransmission
                ? `${selectedTransmission.make} ${selectedTransmission.model}`
                : "None"
            }
          />
          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      )}

      {/* Bottom nav */}
      <View style={styles.footer}>
        {step < 3 ? (
          <TouchableOpacity
            style={[
              styles.nextBtn,
              ((step === 0 && !selectedVehicle) ||
                (step === 1 && !selectedEngine)) &&
                styles.nextBtnDisabled,
            ]}
            onPress={() => setStep((step + 1) as Step)}
            disabled={
              (step === 0 && !selectedVehicle) ||
              (step === 1 && !selectedEngine)
            }
          >
            <Text style={styles.nextBtnText}>
              {step === 2 ? "Review" : "Next"}
            </Text>
            <ChevronRight color={colors.primaryForeground} size={18} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, creating && styles.nextBtnDisabled]}
            onPress={create}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.nextBtnText}>Create Build</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Add Engine Modal */}
      <Modal
        visible={addEngineOpen}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add a Different Engine</Text>
            <TouchableOpacity onPress={() => setAddEngineOpen(false)}>
              <X color={colors.text} size={20} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Describe the engine — AI will identify it.
          </Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.filter, { flex: 1, marginBottom: 0 }]}
              value={engineQuery}
              onChangeText={setEngineQuery}
              placeholder='e.g. "cummins 12 valve"'
              placeholderTextColor={colors.textSubtle}
              returnKeyType="search"
              onSubmitEditing={handleEngineSearch}
            />
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleEngineSearch}
              disabled={engineQueryLoading}
            >
              {engineQueryLoading ? (
                <ActivityIndicator
                  color={colors.primaryForeground}
                  size="small"
                />
              ) : (
                <Search color={colors.primaryForeground} size={18} />
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {engineSuggestions.map((sug, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionCard}
                onPress={() => handleSelectEngineSuggestion(sug)}
              >
                <Text style={styles.suggestionTitle}>
                  {sug.make} {sug.model} {sug.variant ?? ""}
                </Text>
                <Text style={styles.suggestionSub}>
                  {[
                    sug.displacement_liters
                      ? `${sug.displacement_liters}L`
                      : null,
                    sug.power_hp ? `${sug.power_hp} hp` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                {sug.explanation ? (
                  <Text style={styles.suggestionNote}>{sug.explanation}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
            {selectedEngineSug && (
              <View style={styles.donorBox}>
                <Text style={styles.donorLabel}>Donor Vehicle</Text>
                <Text style={styles.donorHint}>
                  The vehicle this engine came from — used to find the correct
                  factory service manual.
                </Text>
                <View style={styles.donorRow}>
                  <TextInput
                    style={[styles.filter, styles.donorInput]}
                    value={engineDonorYear}
                    onChangeText={setEngineDonorYear}
                    placeholder="Year"
                    placeholderTextColor={colors.textSubtle}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[styles.filter, styles.donorInput]}
                    value={engineDonorMake}
                    onChangeText={setEngineDonorMake}
                    placeholder="Make"
                    placeholderTextColor={colors.textSubtle}
                  />
                  <TextInput
                    style={[styles.filter, styles.donorInput]}
                    value={engineDonorModel}
                    onChangeText={setEngineDonorModel}
                    placeholder="Model"
                    placeholderTextColor={colors.textSubtle}
                  />
                </View>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleConfirmEngineSuggestion}
                >
                  <Text style={styles.confirmBtnText}>Confirm Selection</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Transmission Modal */}
      <Modal
        visible={addTransOpen}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add a Different Transmission</Text>
            <TouchableOpacity onPress={() => setAddTransOpen(false)}>
              <X color={colors.text} size={20} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Describe the transmission — AI will identify it.
          </Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.filter, { flex: 1, marginBottom: 0 }]}
              value={transQuery}
              onChangeText={setTransQuery}
              placeholder='e.g. "t56 magnum"'
              placeholderTextColor={colors.textSubtle}
              returnKeyType="search"
              onSubmitEditing={handleTransSearch}
            />
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleTransSearch}
              disabled={transQueryLoading}
            >
              {transQueryLoading ? (
                <ActivityIndicator
                  color={colors.primaryForeground}
                  size="small"
                />
              ) : (
                <Search color={colors.primaryForeground} size={18} />
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {transSuggestions.map((sug, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionCard}
                onPress={() => handleSelectTransSuggestion(sug)}
              >
                <Text style={styles.suggestionTitle}>
                  {sug.make} {sug.model}
                </Text>
                <Text style={styles.suggestionSub}>
                  {[
                    sug.trans_type,
                    sug.gear_count ? `${sug.gear_count}-speed` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                {sug.explanation ? (
                  <Text style={styles.suggestionNote}>{sug.explanation}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
            {selectedTransSug && (
              <View style={styles.donorBox}>
                <Text style={styles.donorLabel}>Donor Vehicle</Text>
                <Text style={styles.donorHint}>
                  The vehicle this transmission came from — used to find the
                  correct factory service manual.
                </Text>
                <View style={styles.donorRow}>
                  <TextInput
                    style={[styles.filter, styles.donorInput]}
                    value={transDonorYear}
                    onChangeText={setTransDonorYear}
                    placeholder="Year"
                    placeholderTextColor={colors.textSubtle}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[styles.filter, styles.donorInput]}
                    value={transDonorMake}
                    onChangeText={setTransDonorMake}
                    placeholder="Make"
                    placeholderTextColor={colors.textSubtle}
                  />
                  <TextInput
                    style={[styles.filter, styles.donorInput]}
                    value={transDonorModel}
                    onChangeText={setTransDonorModel}
                    placeholder="Model"
                    placeholderTextColor={colors.textSubtle}
                  />
                </View>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleConfirmTransSuggestion}
                >
                  <Text style={styles.confirmBtnText}>Confirm Selection</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FamilyCard({
  family,
  onPress,
}: {
  family: EngineFamily;
  onPress: () => void;
}) {
  const hps = family.variants
    .map((v) => v.power_hp)
    .filter(Boolean) as number[];
  const hpMin = hps.length ? Math.min(...hps) : null;
  const hpMax = hps.length ? Math.max(...hps) : null;
  return (
    <TouchableOpacity style={styles.familyCard} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.familyName}>{family.family}</Text>
        <Text style={styles.familyMake}>{family.make}</Text>
        {hpMin !== null && (
          <Text style={styles.familyHp}>
            {hpMin === hpMax ? `${hpMin} HP` : `${hpMin}–${hpMax} HP`}
          </Text>
        )}
      </View>
      <View style={styles.variantBadge}>
        <Text style={styles.variantBadgeText}>
          {family.variants.length}{" "}
          {family.variants.length === 1 ? "variant" : "variants"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function TransCard({
  trans,
  selected,
  onPress,
}: {
  trans: Transmission;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.selectCard, selected && styles.selectCardActive]}
      onPress={onPress}
    >
      <View style={styles.selectCheck}>
        {selected && <Check color={colors.text} size={14} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.selectTitle}>
          {trans.make} {trans.model}
          {trans.trans_type ? `  (${trans.trans_type})` : ""}
        </Text>
        <Text style={styles.selectSubtitle}>
          {[
            trans.gear_count ? `${trans.gear_count}-speed` : null,
            trans.max_torque_capacity_lb_ft
              ? `${trans.max_torque_capacity_lb_ft} lb-ft max`
              : null,
            trans.drivetrain_type
              ? trans.drivetrain_type === "4WD"
                ? "4WD (transfer case)"
                : trans.drivetrain_type
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SelectCard({
  selected,
  onPress,
  title,
  subtitle,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.selectCard, selected && styles.selectCardActive]}
      onPress={onPress}
    >
      <View style={styles.selectCheck}>
        {selected && <Check color={colors.text} size={14} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.selectTitle}>{title}</Text>
        {subtitle && <Text style={styles.selectSubtitle}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
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
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text },
  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepItem: { alignItems: "center", flex: 1 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNum: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: "600",
  },
  stepNumActive: { color: colors.primaryForeground },
  stepLabel: { fontSize: 10, color: colors.textMuted },
  stepLabelActive: { color: colors.text, fontWeight: "600" },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  filter: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.md,
  },
  // Family cards
  familyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  familyName: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.text,
  },
  familyMake: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  familyHp: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  variantBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  variantBadgeText: { fontSize: fontSize.xs, color: colors.textMuted },
  // Select cards
  selectCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectCardActive: {
    borderColor: colors.textMuted,
    backgroundColor: colors.surfaceElevated,
  },
  selectCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.textSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  selectTitle: { fontSize: fontSize.sm, fontWeight: "500", color: colors.text },
  selectSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Chassis info box
  chassisInfo: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  chassisInfoLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  chassisInfoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  // Selected info
  selectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  selectedInfoText: { fontSize: fontSize.sm, color: colors.text },
  // Add button
  addBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  addBtnText: { fontSize: fontSize.sm, color: colors.textMuted },
  // Review
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  reviewValue: { fontSize: fontSize.sm, fontWeight: "500", color: colors.text },
  error: {
    color: colors.destructiveForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  nextBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
  // Modal
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingHorizontal: spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  suggestionTitle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.text,
  },
  suggestionSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  suggestionNote: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    marginTop: 4,
    fontStyle: "italic",
  },
  // Donor vehicle section in modals
  donorBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  donorLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  donorHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  donorRow: { flexDirection: "row", gap: spacing.xs },
  donorInput: { flex: 1, marginBottom: spacing.sm },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  confirmBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
});
