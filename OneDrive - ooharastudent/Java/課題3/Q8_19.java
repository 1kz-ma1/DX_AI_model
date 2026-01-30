import java.util.LinkedHashMap;
import java.util.Map;

public class Q8_19 {
        public static void main(String[] args) {
            Map<String, String> capitals = new LinkedHashMap<>();
            capitals.put("青森県", "青森市");
            capitals.put("秋田県", "秋田市");
            capitals.put("岩手県", "盛岡市");
            capitals.put("山形県", "山形市");
            capitals.put("宮城県", "仙台市");
            capitals.put("福島県", "福島市");

            System.out.println("東北地方の都道府県名と県庁所在地");
            for (Map.Entry<String, String> e:capitals.entrySet()) { // for文で全要素を取得
                System.out.printf("%sの県庁所在地は%sです。%n", e.getKey(),e.getValue());  // キーと値を取得して表示
            }
        }
    }

