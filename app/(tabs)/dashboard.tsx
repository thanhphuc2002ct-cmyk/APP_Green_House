// Use the browser build of mqtt.js for React Native (avoids Node stream deps).
import mqtt, { MqttClient } from 'mqtt';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const MQTT_HOST = 'broker.emqx.io';
const MQTT_PORT = 8084;
const MQTT_USE_SSL = true;

const MQTT_PUB_TOPIC = 'greenhouse/esp32';
const MQTT_SUB_TOPIC = 'greenhouse/esp32/control';
const MQTT_STATE_TOPIC = 'greenhouse/esp32/state';
const MQTT_ALERT_TOPIC = 'greenhouse/esp32/alert';

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
  // soil2?: number;
  light_percent?: number;
  uv_percent?: number;
  dht_temperature?: number;
  dht_humidity?: number; 
};

type EspStatePayload = {
  fan?: 0 | 1;
  motor?: 0 | 1;
  light?: 0 | 1;
  fan_mode?: Mode;
  motor_mode?: Mode;
  light_mode?: Mode;
};

type AlertPayload = {
  type?: string;
  message?: string;
  status?: 'warning' | 'normal' | 'danger';
  uv_percent?: number;
  humidity?: number;
  air_quality?: number;
  mq135_ppm?: number;
  soil1?: number;
  // soil2?: number;
  soil1_percent?: number;
  // soil2_percent?: number;
  threshold?: number;
  air_state?: string;
  threshold_warn?: number;
  threshold_high?: number;
};

export default function DashboardScreen() {
  const clientRef = useRef<MqttClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [hasData, setHasData] = useState(false); // Track xem có nhận được data từ ESP32 không
  const lastDataTimeRef = useRef<number>(0); // Thời gian nhận data cuối cùng
  const dataTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sensors, setSensors] = useState<SensorPayload>({});
  const [device, setDevice] = useState({ fan: false, motor: false, light: false });
  const [modes, setModes] = useState<{ fan: Mode; motor: Mode; light: Mode }>({
    fan: 'AUTO',
    motor: 'AUTO',
    light: 'AUTO',
  });
  
  // State để track các cảnh báo đang active
  const [alerts, setAlerts] = useState({
    uv: false,
    air: false,
    soil: false,
    temperature: 0,
  });
  
  // State để track mức độ cảnh báo không khí
  const [airAlertLevel, setAirAlertLevel] = useState<'warning' | 'danger' | null>(null);

  const clientId = useMemo(() => `dash_${Math.random().toString(16).slice(2)}_${Date.now()}`, []);

  const connectMqtt = () => {
    // Nếu đã connected nhưng mất data, reset và đợi data mới
    if (clientRef.current?.connected && !hasData) {
      setHasData(false);
      lastDataTimeRef.current = Date.now();
      startDataTimeout();
      return;
    }
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
      setHasData(false); // Reset khi kết nối mới
      lastDataTimeRef.current = Date.now();
      client.subscribe(MQTT_PUB_TOPIC, { qos: 0 });
      client.subscribe(MQTT_STATE_TOPIC, { qos: 0 });
      client.subscribe(MQTT_ALERT_TOPIC, { qos: 0 });
      
      // Bắt đầu timer kiểm tra data
      startDataTimeout();
    });
    client.on('reconnect', () => {
      setConnected(false);
      setHasData(false);
      clearDataTimeout();
    });
    client.on('close', () => {
      setConnected(false);
      setHasData(false);
      clearDataTimeout();
    });
    client.on('error', (err) => {
      setConnected(false);
      setHasData(false);
      clearDataTimeout();
      console.log('[MQTT] error', err?.message ?? err);
    });

client.on('message', (topic, payload) => {
      const fixedPayload = payload.toString().replace(/nan/g, 'null');
      const data = safeJsonParse<Record<string, any>>(fixedPayload);
      if (!data) return;

      // Reset timer khi nhận được data từ ESP32 (sensor hoặc state)
      if (topic === MQTT_PUB_TOPIC || topic === MQTT_STATE_TOPIC) {
        lastDataTimeRef.current = Date.now();
        setHasData(true);
        startDataTimeout();
      }

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
      } else if (topic === MQTT_ALERT_TOPIC) {
        const alert = data as AlertPayload;
        const alertType = alert.type || '';
        const status = alert.status || 'normal';
        
        // Xử lý cảnh báo UV
        if (alertType === 'uv_warning') {
          setAlerts((prev) => ({ ...prev, uv: true }));
        } else if (alertType === 'uv_normal') {
          setAlerts((prev) => ({ ...prev, uv: false }));
        }
        // ******* Nhận MQTT từ esp32  mà có 2 độ ẩm đất *******//
        // else if (alertType === 'soil1_warning' || alertType === 'soil2_warning') {
        //   setAlerts((prev) => ({ ...prev, soil: true }));
        // } else if (alertType === 'soil1_normal' || alertType === 'soil2_normal') {
        //   setAlerts((prev) => ({ ...prev, soil: false }));
        // }
            // ******* Nhận MQTT từ esp32  mà chỉ có 1 độ ẩm đất *******//
        else if (alertType === 'soil1_warning') {
          setAlerts((prev) => ({ ...prev, soil: true }));
        } else if (alertType === 'soil1_normal') {
          setAlerts((prev) => ({ ...prev, soil: false }));
        }


        // Xử lý cảnh báo nhiệt độ
        else if (alertType === 'temp_warning' || alertType === 'temp_danger') {
          setAlerts((prev) => ({ ...prev, temperature: 1 }));
        } else if (alertType === 'temp_normal') {
          setAlerts((prev) => ({ ...prev, temperature: 0 }));
        }
        // Xử lý cảnh báo chất lượng không khí (danger và warning đều nhấp nháy)
        else if (alertType === 'air_danger') {
          setAlerts((prev) => ({ ...prev, air: true }));
          setAirAlertLevel('danger');
        } else if (alertType === 'air_warning') {
          setAlerts((prev) => ({ ...prev, air: true }));
          setAirAlertLevel('warning');
        } else if (alertType === 'air_normal') {
          setAlerts((prev) => ({ ...prev, air: false }));
          setAirAlertLevel(null);
        }
        
        const alertStatus = status === 'warning' || status === 'danger' ? 'CẢNH BÁO' : 'BÌNH THƯỜNG';
        console.log('[Alert]', alertType, alertStatus);
      }
    });
  };

  const startDataTimeout = () => {
    clearDataTimeout();
    dataTimeoutRef.current = setTimeout(() => {
      // Nếu đã kết nối nhưng quá 5s không nhận được data
      if (clientRef.current?.connected && Date.now() - lastDataTimeRef.current > 5000) {
        setHasData(false);
      }
    }, 5000);
  };

  const clearDataTimeout = () => {
    if (dataTimeoutRef.current) {
      clearTimeout(dataTimeoutRef.current);
      dataTimeoutRef.current = null;
    }
  };

  const disconnectMqtt = () => {
    const c = clientRef.current;
    if (!c) return;
    clearDataTimeout();
    try {
      c.end(true);
    } finally {
      clientRef.current = null;
      setConnected(false);
      setHasData(false);
    }
  };

  useEffect(() => {
    connectMqtt();
    return () => {
      disconnectMqtt();
      clearDataTimeout();
    };
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

      <View style={styles.twoCardRow}>
        <View style={[styles.card, styles.halfCard, styles.centeredCard]}>
          <Text style={[styles.cardTitle, styles.centeredText]}>Trạng thái</Text>
          <TouchableOpacity
            onPress={connected && hasData ? disconnectMqtt : connectMqtt}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.badge,
                styles.centeredBadge,
                { backgroundColor: connected && hasData ? '#4CAF50' : '#9E9E9E' },
              ]}
            >
              {connected && hasData
                ? 'ĐÃ KẾT NỐI'
                : 'MẤT KẾT NỐI'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, styles.halfCard, styles.centeredCard]}>
          <Text style={styles.greenHouseTitle}>GREEN{'\n'}HOUSE</Text>
        </View>
      </View>

<View style={styles.card}>
        <Text style={styles.cardTitle}>Cảm biến</Text>
        <View style={styles.grid}>
          <Stat label="Nhiệt độ (°C)" value={sensors.dht_temperature ?? '--'} isAlerting={!!alerts.temperature} />
          <Stat label="Độ ẩm k.khí (%)" value={sensors.dht_humidity ?? '--'} />
          
          {/* <Stat 
            label="Độ ẩm đất (%)" 
            value={(sensors.soil1 != null && sensors.soil2 != null) ? Math.round((sensors.soil1 + sensors.soil2) / 2) : (sensors.soil1 ?? sensors.soil2 ?? '--')} 
            isAlerting={!!alerts.soil} 
          /> */}
          <Stat 
            label="Độ ẩm đất (%)" 
            value={sensors.soil1 ?? '--'} 
            isAlerting={!!alerts.soil} 
          />
          <Stat label="Không Khí(ppm)" value={sensors.mq135_ppm ?? '--'} isAlerting={!!alerts.air} />
          <Stat label="Độ sáng (%)" value={sensors.light_percent ?? '--'} />
          <Stat label="Tia UV (%)" value={sensors.uv_percent ?? '--'} isAlerting={!!alerts.uv} />
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

    
      {(alerts.uv || alerts.air || alerts.soil || alerts.temperature) ? ( 
        <View style={styles.alertCard}>
          <Text style={styles.alertCardTitle}>Cảnh báo</Text>
          <View style={styles.alertList}>
      
            {alerts.uv && (
              <View style={[styles.alertItem, styles.alertItemDanger]}>
                <MaterialIcons name="warning" size={20} color="#FF3B30" />
                <Text style={styles.alertItemText}>Cảnh báo nắng gắt</Text>
              </View>
            )}
            {alerts.air && (
              <View
                style={[
                  styles.alertItem,
                  airAlertLevel === 'danger' ? styles.alertItemDanger : styles.alertItemWarning,
                ]}
              >
                <MaterialIcons
                  name="warning"
                  size={20}
                  color={airAlertLevel === 'danger' ? '#FF3B30' : '#FF9800'}
                />
                <Text style={styles.alertItemText}>
                  {airAlertLevel === 'danger'
                    ? 'Cảnh báo không khí nguy hiểm'
                    : 'Cảnh báo không khí trung bình'}
                </Text>
              </View>
            )}
            {!!alerts.soil && (
              <View style={[styles.alertItem, styles.alertItemWarning]}>
                <MaterialIcons name="warning" size={20} color="#FF9800" />
                <Text style={styles.alertItemText}>Cảnh báo đất quá khô</Text>
              </View>
            )}
            {!!alerts.temperature && (
              <View style={[styles.alertItem, styles.alertItemDanger]}>
                <MaterialIcons name="warning" size={20} color="#FF3B30" />
                <Text style={styles.alertItemText}>Cảnh báo: Nhiệt độ quá cao!</Text>
              </View>
            )}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Stat({ label, value, isAlerting = false }: { label: string; value: string | number; isAlerting?: boolean }) {
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Dừng animation cũ nếu có
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    if (isAlerting) {
      // Tạo animation nhấp nháy
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animationRef.current = animation;
      animation.start();
    } else {
      // Dừng animation và reset về bình thường
      blinkAnim.setValue(1);
    }

    // Cleanup khi component unmount hoặc isAlerting thay đổi
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [isAlerting]);

  return (
    <Animated.View 
      style={[
        styles.stat,
        isAlerting && {
          opacity: blinkAnim,
          borderColor: '#FF3B30',
          borderWidth: 2,
          backgroundColor: '#FFF5F5',
        }
      ]}
    >
      <Text style={[styles.statLabel, isAlerting && styles.statLabelAlert]}>{label}</Text>
      <Text style={[styles.statValue, isAlerting && styles.statValueAlert]}>{String(value)}</Text>
    </Animated.View>
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
  twoCardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  halfCard: {
    flex: 1,
    marginBottom: 0,
  },
  centeredCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  centeredBadge: {
    alignSelf: 'center',
    marginBottom: 0,
  },
  greenHouseTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4CAF50',
    textAlign: 'center',
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
  statLabelAlert: {
    color: '#FF3B30',
    fontWeight: '800',
  },
  statValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '900',
    color: '#111',
  },
  statValueAlert: {
    color: '#FF3B30',
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
  alertCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  alertCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    color: '#222',
  },
  alertList: {
    gap: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  alertItemWarning: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  alertItemDanger: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  alertItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
});
