// Use the browser build of mqtt.js for React Native (avoids Node stream deps).
import mqtt, { MqttClient } from 'mqtt';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Không hiển thị kết nối MQTT ở màn hình này.
// Màn hình này chỉ để chỉnh và gửi cài đặt.

const MQTT_HOST = 'broker.emqx.io';
const MQTT_PORT = 8084;
const MQTT_USE_SSL = true;

const MQTT_SUB_TOPIC = 'greenhouse/esp32/control';
const MQTT_STATE_TOPIC = 'greenhouse/esp32/state'; // để auto-fill giá trị hiện tại

type Mode = 'AUTO' | 'MANUAL';

type EspStatePayload = {
  fan_mode?: Mode;
  motor_mode?: Mode;
  light_mode?: Mode;
  threshold_air?: number;
  threshold_soil?: number;
  threshold_light?: number;
  threshold_temp?: number;
  fan_auto_off?: number;
  motor_auto_off?: number;
  light_auto_off?: number;

  // nếu ESP32 publish thêm
  fan?: 0 | 1;
  motor?: 0 | 1;
  light?: 0 | 1;
};

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export default function SettingsScreen() {
  const clientRef = useRef<MqttClient | null>(null);

  const [fanMode, setFanMode] = useState<Mode>('AUTO');
  const [motorMode, setMotorMode] = useState<Mode>('AUTO');
  const [lightMode, setLightMode] = useState<Mode>('AUTO');

  const [thresholdAir, setThresholdAir] = useState('1000');
  const [thresholdSoil, setThresholdSoil] = useState('30');
  const [thresholdLight, setThresholdLight] = useState('10');
  const [thresholdTemp, setThresholdTemp] = useState('35');

  const [fanAutoOff, setFanAutoOff] = useState('5');
  const [motorAutoOff, setMotorAutoOff] = useState('5');
  const [lightAutoOff, setLightAutoOff] = useState('5');

  const clientId = useMemo(() => `settings_${Math.random().toString(16).slice(2)}_${Date.now()}`, []);

  const ensureClient = () => {
    if (clientRef.current) return clientRef.current;

    const url = `${MQTT_USE_SSL ? 'wss' : 'ws'}://${MQTT_HOST}:${MQTT_PORT}/mqtt`;

    const c = (mqtt as any).connect(url, {
      clientId,
      keepalive: 30,
      reconnectPeriod: 2000,
      connectTimeout: 10_000,
      clean: true,
      protocolVersion: 4,
    });

    c.on('error', (err: any) => {
      console.log('[MQTT] error', err?.message ?? err);
    });

    c.on('connect', () => {
      // Subscribe state để tự fill giá trị hiện tại
      c.subscribe(MQTT_STATE_TOPIC, { qos: 0 });
    });

    c.on('message', (topic: string, payload: any) => {
      if (topic !== MQTT_STATE_TOPIC) return;
      const data = safeJsonParse<EspStatePayload>(payload.toString());
      if (!data) return;

      if (data.fan_mode) setFanMode(data.fan_mode);
      if (data.motor_mode) setMotorMode(data.motor_mode);
      if (data.light_mode) setLightMode(data.light_mode);

      if (typeof data.threshold_air === 'number') setThresholdAir(String(data.threshold_air));
      if (typeof data.threshold_soil === 'number') setThresholdSoil(String(data.threshold_soil));
      if (typeof data.threshold_light === 'number') setThresholdLight(String(data.threshold_light));
      if (typeof data.threshold_temp === 'number') setThresholdTemp(String(data.threshold_temp));

      if (typeof data.fan_auto_off === 'number') setFanAutoOff(String(data.fan_auto_off));
      if (typeof data.motor_auto_off === 'number') setMotorAutoOff(String(data.motor_auto_off));
      if (typeof data.light_auto_off === 'number') setLightAutoOff(String(data.light_auto_off));
    });

    clientRef.current = c;
    return c;
  };

  useEffect(() => {
    const c = ensureClient();
    return () => {
      try {
        c.end(true);
      } finally {
        clientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publish = (obj: Record<string, any>) => {
    const c = ensureClient();
    if (!c.connected) {
      Alert.alert('MQTT', 'Đang kết nối... thử lại sau 1-2 giây.');
      return;
    }
    c.publish(MQTT_SUB_TOPIC, JSON.stringify(obj), { qos: 0, retain: false });
  };

  // Quan trọng: khi bấm đổi mode, gửi ngay 1 message MQTT
  // => ESP32 xử lý và publish state => Bảng điều khiển sẽ đổi (Quạt (AUTO) -> Quạt (MANUAL))
  const setModeAndPublish = (device: 'fan' | 'motor' | 'light', mode: Mode) => {
    if (device === 'fan') setFanMode(mode);
    if (device === 'motor') setMotorMode(mode);
    if (device === 'light') setLightMode(mode);

    publish({ [`${device}_mode`]: mode });
  };

  const saveAll = () => {
    const air = Number(thresholdAir);
    const soil = Number(thresholdSoil);
    const light = Number(thresholdLight);
    const temp = Number(thresholdTemp);
    const fanOff = Number(fanAutoOff);
    const motorOff = Number(motorAutoOff);
    const lightOff = Number(lightAutoOff);

  if (!Number.isFinite(air) || !Number.isFinite(soil) || !Number.isFinite(light) || !Number.isFinite(temp)) {
    Alert.alert('Lỗi', 'Ngưỡng phải là số hợp lệ.');
    return;
  }
    if (!Number.isFinite(fanOff) || !Number.isFinite(motorOff) || !Number.isFinite(lightOff)) {
      Alert.alert('Lỗi', 'Auto-off phải là số hợp lệ.');
      return;
    }

    publish({
      fan_mode: fanMode,
      motor_mode: motorMode,
      light_mode: lightMode,
      threshold_air: Math.trunc(air),
      threshold_soil: Math.trunc(soil),
      threshold_light: Math.trunc(light),
      threshold_temp: Math.trunc(temp),
      fan_auto_off: Math.trunc(fanOff),
      motor_auto_off: Math.trunc(motorOff),
      light_auto_off: Math.trunc(lightOff),
    });

    Alert.alert('OK', 'Đã gửi cài đặt.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Image source={require('../../assets/images/logo.jpg')} style={styles.logo} />
        <Text style={styles.header}>Cài đặt</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ngưỡng</Text>
        <Field label="Nhiệt độ (°C)" value={thresholdTemp} onChange={setThresholdTemp} />
        <Field label="Không khí (ppm)" value={thresholdAir} onChange={setThresholdAir} />
        <Field label="Độ ẩm đất (%)" value={thresholdSoil} onChange={setThresholdSoil} />
        <Field label="Ánh sáng (%)" value={thresholdLight} onChange={setThresholdLight} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Chế độ</Text>
        <ModeRow title="Quạt" value={fanMode} onSet={(m) => setModeAndPublish('fan', m)} />
        <ModeRow title="Máy bơm" value={motorMode} onSet={(m) => setModeAndPublish('motor', m)} />
        <ModeRow title="Đèn" value={lightMode} onSet={(m) => setModeAndPublish('light', m)} />
        <Text style={styles.hint}>Bấm để đổi chế độ (gửi ngay để Bảng điều khiển cập nhật).</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tự tắt (phút)</Text>
        <Field label="Quạt auto-off" value={fanAutoOff} onChange={setFanAutoOff} />
        <Field label="Máy bơm auto-off" value={motorAutoOff} onChange={setMotorAutoOff} />
        <Field label="Đèn auto-off" value={lightAutoOff} onChange={setLightAutoOff} />
      </View>

      <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={saveAll}>
        <Text style={styles.btnText}>Lưu</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="Nhập số"
        style={styles.input}
      />
    </View>
  );
}

function ModeRow({
  title,
  value,
  onSet,
}: {
  title: string;
  value: Mode;
  onSet: (m: Mode) => void;
}) {
  return (
    <View style={styles.modeRow}>
      <Text style={styles.modeTitle}>{title}</Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={[styles.pill, value === 'AUTO' ? styles.pillAutoActive : styles.pillInactive]}
          onPress={() => onSet('AUTO')}>
          <Text style={[styles.pillText, value === 'AUTO' ? styles.pillTextAuto : styles.pillTextInactive]}>
            TỰ ĐỘNG
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, value === 'MANUAL' ? styles.pillManualActive : styles.pillInactive]}
          onPress={() => onSet('MANUAL')}>
          <Text style={[styles.pillText, value === 'MANUAL' ? styles.pillTextManual : styles.pillTextInactive]}>
            THỦ CÔNG
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  logo: {
    width: 25,
    height: 25,
    borderRadius: 8,
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    color: '#222',  
  },
  hint: {
    marginTop: 6,
    color: '#666',
    fontSize: 12,
  },
  field: {
    marginBottom: 10,
  },
  label: {
    color: '#333',
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 6,
  },
  modeTitle: {
    fontWeight: '900',
    color: '#111',
    minWidth: 90,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 2,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillInactive: {
    backgroundColor: 'transparent',
    borderColor: '#BDBDBD',
  },
  pillAutoActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  pillManualActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  pillText: {
    fontWeight: '900',
  },
  pillTextInactive: {
    color: '#757575',
  },
  pillTextAuto: {
    color: '#2E7D32',
  },
  pillTextManual: {
    color: '#E65100',
  },
  btn: {
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnPrimary: {
    backgroundColor: '#2196F3',
  },
  btnText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
  },
});
