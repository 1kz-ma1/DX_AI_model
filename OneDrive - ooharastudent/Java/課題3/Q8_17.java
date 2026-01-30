import java.util.LinkedHashMap;
import java.util.Map;

public class Q8_17 {
    public static void main(String[] args) {
        LinkedHashMap<String, Integer> scores = new LinkedHashMap<>(); // 初期設定
        scores.put("国語", 75);
        scores.put("数学", 80);
        System.out.println(formatAsDict(scores)); // {国語=75, 数学=80}
        
        LinkedHashMap<String, Integer> scores2 = new LinkedHashMap<>(); // キー[算数->数学]変換用
        for (Map.Entry<String, Integer> e:scores.entrySet()) {
            String key = e.getKey().equals("算数")?"数学":e.getKey();
            scores2.put(key, e.getValue());
        }

        System.out.println(formatAsDict(scores2)); // {国語=75, 数学=80

        // 科目追加
        scores2.put("理科", 65);
        scores2.put("社会", 90);
        scores2.put("英語", 70);
        System.out.println(formatAsDict(scores2)); // {国語=75, 数学=80, 理科=65, 社会=90, 英語=70}
        }

        private static String formatAsDict(Map<String, Integer> map) {
            StringBuilder sb = new StringBuilder();
            sb.append("{");
            boolean first = true;
            for (Map.Entry<String, Integer> e:map.entrySet()) {
                if (!first) sb.append(", ");
                first = false;
                sb.append("'").append(e.getKey()).append("':").append(e.getValue());
            }
            sb.append("}");
            return sb.toString();
        }
}

