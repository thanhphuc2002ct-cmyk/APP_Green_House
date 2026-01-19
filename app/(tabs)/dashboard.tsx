// Use the browser build of mqtt.js for React Native (avoids Node stream deps).
import mqtt, { MqttClient } from 'mqtt';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MQTT_HOST = 'broker.emqx.io';
const MQTT_PORT = 8084;
const MQTT_USE_SSL = true;

const MQTT_PUB_TOPIC = 'greenhouse/esp32';
const MQTT_SUB_TOPIC = 'greenhouse/esp32/control';
const MQTT_STATE_TOPIC = 'greenhouse/esp32/state';

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

type DeviceKey = 'fan' | 'motor' | 'light';
type Mode = 'AUTO' | 'MANUAL';

type SensorPayload = {
  mq135_ppm?: number;
  soil1?: number;
  soil2?: number;
  light_percent?: number;
  uv_percent?: number;
};

type EspStatePayload = {
  fan?: 0 | 1;
  motor?: 0 | 1;
  light?: 0 | 1;
  fan_mode?: Mode;
  motor_mode?: Mode;
  light_mode?: Mode;
};

export default function DashboardScreen() {
  const clientRef = useRef<MqttClient | null>(null);
  const [connected, setConnected] = useState(false);

  const [sensors, setSensors] = useState<SensorPayload>({});
  const [device, setDevice] = useState({ fan: false, motor: false, light: false });
  const [modes, setModes] = useState<{ fan: Mode; motor: Mode; light: Mode }>({
    fan: 'AUTO',
    motor: 'AUTO',
    light: 'AUTO',
  });

  const clientId = useMemo(() => `dash_${Math.random().toString(16).slice(2)}_${Date.now()}`, []);

  const connectMqtt = () => {
    if (clientRef.current?.connected) return;

    const url = `${MQTT_USE_SSL ? 'wss' : 'ws'}://${MQTT_HOST}:${MQTT_PORT}/mqtt`;
    const client = mqtt.connect(url, {
      clientId,
      keepalive: 30,
      reconnectPeriod: 2000,
      connectTimeout: 10_000,
      clean: true,
      protocolVersion: 4,
    });
    clientRef.current = client;

    client.on('connect', () => {
      setConnected(true);
      client.subscribe(MQTT_PUB_TOPIC, { qos: 0 });
      client.subscribe(MQTT_STATE_TOPIC, { qos: 0 });
    });
    client.on('reconnect', () => setConnected(false));
    client.on('close', () => setConnected(false));
    client.on('error', (err) => {
      setConnected(false);
      console.log('[MQTT] error', err?.message ?? err);
    });

    client.on('message', (topic, payload) => {
      const data = safeJsonParse<Record<string, any>>(payload.toString());
      if (!data) return;

      if (topic === MQTT_PUB_TOPIC) {
        setSensors((prev) => ({ ...prev, ...data }));
      } else if (topic === MQTT_STATE_TOPIC) {
        const st = data as EspStatePayload;
        setDevice((prev) => ({
          fan: typeof st.fan === 'number' ? st.fan === 1 : prev.fan,
          motor: typeof st.motor === 'number' ? st.motor === 1 : prev.motor,
          light: typeof st.light === 'number' ? st.light === 1 : prev.light,
        }));
        setModes((prev) => ({
          fan: st.fan_mode ?? prev.fan,
          motor: st.motor_mode ?? prev.motor,
          light: st.light_mode ?? prev.light,
        }));
      }
    });
  };

  const disconnectMqtt = () => {
    const c = clientRef.current;
    if (!c) return;
    try {
      c.end(true);
    } finally {
      clientRef.current = null;
      setConnected(false);
    }
  };

  useEffect(() => {
    connectMqtt();
    return () => disconnectMqtt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publishControl = (payloadObj: Record<string, any>) => {
    const c = clientRef.current;
    if (!c?.connected) {
      Alert.alert('MQTT', 'Chưa kết nối broker.');
      return;
    }
    c.publish(MQTT_SUB_TOPIC, JSON.stringify(payloadObj), { qos: 0, retain: false });
  };

  const toggleDevice = (k: DeviceKey) => {
    const next = !device[k];
    setDevice((prev) => ({ ...prev, [k]: next }));
    publishControl({ [k]: next ? 'on' : 'off' });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Image source={require('../../assets/images/logo.jpg')} style={styles.logo} />
        <Text style={styles.header}>Bảng điều khiển</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trạng thái</Text>
        <Text style={[styles.badge, { backgroundColor: connected ? '#4CAF50' : '#9E9E9E' }]}
        >
          {connected ? 'ĐÃ KẾT NỐI' : 'CHƯA KẾT NỐI'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[styles.smallBtn, styles.smallBtnPrimary]} onPress={connectMqtt}>
            <Text style={styles.smallBtnText}>Kết nối</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, styles.smallBtnGray]} onPress={disconnectMqtt}>
            <Text style={styles.smallBtnText}>Ngắt kết nối</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cảm biến</Text>
        <View style={styles.grid}>
          <Stat label="Không Khí(ppm)" value={sensors.mq135_ppm ?? '--'} />
          <Stat label="Độ ẩm 1(%)" value={sensors.soil1 ?? '--'} />
          <Stat label="Độ ẩm 2(%)" value={sensors.soil2 ?? '--'} />
          <Stat label="Độ sáng (%)" value={sensors.light_percent ?? '--'} />
          <Stat label="Tia UV (%)" value={sensors.uv_percent ?? '--'} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Điều khiển</Text>
        <View style={styles.controls}>
          <ControlButton 
            label="Quạt" 
            mode={modes.fan}
            active={device.fan} 
            onPress={() => toggleDevice('fan')} 
          />
          <ControlButton 
            label="Máy bơm" 
            mode={modes.motor}
            active={device.motor} 
            onPress={() => toggleDevice('motor')} 
          />
          <ControlButton 
            label="Đèn" 
            mode={modes.light}
            active={device.light} 
            onPress={() => toggleDevice('light')} 
          />
        </View>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{String(value)}</Text>
    </View>
  );
}

function ControlButton({
  label,
  mode,
  active,
  onPress,
}: {
  label: string;
  mode: Mode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.ctrlContainer}>
      <Text style={styles.ctrlLabel}>
        {label} ({mode === 'AUTO' ? 'TỰ ĐỘNG' : 'THỦ CÔNG'})
      </Text>
      <TouchableOpacity
        style={[
          styles.ctrlBtn, 
          { 
            backgroundColor: active ? '#2196F3' : '#E0E0E0',
            borderColor: mode === 'AUTO' ? '#4CAF50' : '#FF9800',
          }
        ]}
        onPress={onPress}>
        <Text style={[styles.ctrlBtnText, { color: active ? 'white' : '#333' }]}>
          {active ? 'ON' : 'OFF'}
        </Text>
      </TouchableOpacity>
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
    width: 40,
    height: 40,
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
  badge: {
    color: 'white',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '800',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallBtnPrimary: {
    backgroundColor: '#111',
  },
  smallBtnGray: {
    backgroundColor: '#9E9E9E',
  },
  smallBtnText: {
    color: 'white',
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    width: '48%',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
  },
  statValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '900',
    color: '#111',
  },
  controls: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  ctrlContainer: {
    minWidth: '31%',
    flexGrow: 1,
  },
  ctrlLabel: {
    fontWeight: '900',
    color: '#111',
    marginBottom: 6,
    textAlign: 'center',
  },
  ctrlBtn: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: '31%',
    alignItems: 'center',
    borderWidth: 2,
  },
  ctrlBtnText: {
    fontWeight: '900',
  },
});
