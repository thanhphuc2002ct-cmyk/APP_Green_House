import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function GuideScreen() {
  const openWebConfig = () => {
    Linking.openURL('http://192.168.4.1').catch((err) => {
      console.error('Không thể mở URL:', err);
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Image source={require('../../assets/images/logo.jpg')} style={styles.logo} />
        <MaterialIcons name="menu-book" size={28} color="#2196F3" />
        <Text style={styles.header}>Hướng dẫn</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cài đặt WiFi cho thiết bị</Text>
        <View style={styles.instructionSection}>
          <Text style={styles.stepNumber}>1.</Text>
          <Text style={styles.stepText}>
            Thiết bị sẽ phát WiFi với tên là GREEN HOUSE. Sử dụng điện thoại/thiết bị của bạn kết nối vào mạng GREEN HOUSE.
          </Text>
        </View>

        <View style={styles.instructionSection}>
          <Text style={styles.stepNumber}>2.</Text>
          <Text style={styles.stepText}>
            Mở trình duyệt và truy cập địa chỉ:{' '}
            <Text style={styles.linkText} onPress={openWebConfig}>
              192.168.4.1
            </Text>
          </Text>
        </View>

        <View style={styles.instructionSection}>
          <Text style={styles.stepNumber}>3.</Text>
          <Text style={styles.stepText}>
            Trong giao diện web, nhập thông tin WiFi (SSID và mật khẩu) mà bạn muốn thiết bị kết nối.
          </Text>
        </View>

        <View style={styles.instructionSection}>
          <Text style={styles.stepNumber}>4.</Text>
          <Text style={styles.stepText}>
            Xác nhận và lưu cài đặt. Thiết bị sẽ tự động kết nối vào mạng WiFi đã cấu hình.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hướng dẫn sử dụng ứng dụng</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Bảng điều khiển</Text>
          <Text style={styles.description}>
            • Xem trạng thái kết nối MQTT và các cảm biến (không khí, độ ẩm đất, ánh sáng){'\n'}
            • Điều khiển các thiết bị: Quạt, Máy bơm, Đèn{'\n'}
            • Chế độ TỰ ĐỘNG: Thiết bị tự bật/tắt dựa trên ngưỡng cảm biến{'\n'}
            • Chế độ THỦ CÔNG: Bạn tự bật/tắt thiết bị bằng nút ON/OFF{'\n'}
            • Theo dõi cảnh báo: Chất lượng không khí, độ ẩm đất thấp
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Cài đặt</Text>
          <Text style={styles.description}>
            • Thiết lập ngưỡng cảnh báo: Không khí (ppm), Độ ẩm đất (%), Ánh sáng (%){'\n'}
            • Chuyển đổi chế độ hoạt động: TỰ ĐỘNG hoặc THỦ CÔNG cho từng thiết bị{'\n'}
            • Cài đặt thời gian tự tắt (phút): Sau khi thiết bị được bật thủ công, sẽ tự tắt sau khoảng thời gian này{'\n'}
            • Nhấn "Lưu" để gửi tất cả cài đặt đến thiết bị
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Cảnh báo</Text>
          <Text style={styles.description}>
            • Cảnh báo không khí: Cảnh báo trung bình (vàng) hoặc nguy hiểm (đỏ) dựa trên chất lượng không khí{'\n'}
            • Cảnh báo độ ẩm đất: Hiển thị màu vàng/cam khi độ ẩm đất quá thấp{'\n'}
            • Các cảnh báo sẽ tự động ẩn khi điều kiện trở về bình thường
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Mẹo sử dụng</Text>
          <Text style={styles.description}>
            • Đảm bảo thiết bị và điện thoại cùng kết nối vào một mạng WiFi để ứng dụng hoạt động{'\n'}
            • Kiểm tra trạng thái kết nối MQTT ở đầu màn hình Bảng điều khiển{'\n'}
            • Trong chế độ TỰ ĐỘNG, hệ thống sẽ tự động điều chỉnh dựa trên dữ liệu cảm biến{'\n'}
            • Bạn có thể chuyển sang chế độ THỦ CÔNG bất cứ lúc nào để kiểm soát thủ công
          </Text>
        </View>
      </View>
    </ScrollView>
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
    marginBottom: 12,
    color: '#222',
  },
  instructionSection: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2196F3',
    marginRight: 8,
    minWidth: 24,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  linkText: {
    color: '#2196F3',
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#222',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
});
