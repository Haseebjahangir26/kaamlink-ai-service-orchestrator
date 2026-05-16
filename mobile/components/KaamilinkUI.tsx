import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/kaamlink';

export function PulsingDot({ color = C.blue }: { color?: string }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ opacity, width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />;
}

type StepStatus = 'waiting' | 'running' | 'done';

export function AgentStepRow({ title, desc, status }: { title: string; desc: string; status: StepStatus }) {
  const isRunning = status === 'running';
  const isDone = status === 'done';
  return (
    <View style={[s.row, isRunning && s.rowActive]}>
      <View style={s.iconCol}>
        {isDone   && <Ionicons name="checkmark-circle" size={16} color={C.green} />}
        {isRunning && <PulsingDot color={C.blue} />}
        {status === 'waiting' && <Ionicons name="radio-button-off" size={16} color={C.textMuted} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, status === 'waiting' && { color: C.textMuted }]}>{title}</Text>
        <Text style={[s.desc, status === 'waiting' && { color: C.textMuted }]}>{desc}</Text>
      </View>
    </View>
  );
}

export function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.sectionRow}>
      <Ionicons name={icon as any} size={13} color={C.green} />
      <Text style={s.sectionLabel}>{label}</Text>
    </View>
  );
}

export function NavHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={s.nav}>
      {onBack
        ? <Text style={s.backBtn} onPress={onBack}>← Back</Text>
        : <View style={{ width: 60 }} />}
      <Text style={s.navTitle}>{title}</Text>
      <View style={{ width: 60 }} />
    </View>
  );
}

export function Avatar({ name, color = C.blue, size = 44 }: { name: string; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '33', borderWidth: 1, borderColor: color + '55', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontWeight: '800', fontSize: size * 0.4 }}>{name?.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start' },
  rowActive: { backgroundColor: C.blueGlow, padding: 10, borderRadius: 12, marginHorizontal: -10, borderWidth: 1, borderColor: C.blue + '44' },
  iconCol: { width: 22, alignItems: 'center', marginRight: 10, marginTop: 2 },
  title: { fontSize: 12, fontWeight: '700', color: C.textSub, letterSpacing: 0.5, marginBottom: 3 },
  desc: { fontSize: 13, color: C.text, lineHeight: 18 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.textSub, letterSpacing: 1.2, marginLeft: 7 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  navTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  backBtn: { fontSize: 15, color: C.blue, fontWeight: '600', width: 60 },
});
