import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Scanner;

public class Q8_23 {
        public static void main(String[] args) {
        Map<Integer, String> month = new LinkedHashMap<>(); // 月名変換用マップ
        month.put(1, "January");
        month.put(2, "February");
        month.put(3, "March");
        month.put(4, "April");
        month.put(5, "May");
        month.put(6, "June");
        month.put(7, "July");
        month.put(8, "August");
        month.put(9, "September");
        month.put(10, "October");
        month.put(11, "November");
        month.put(12, "December");

        try(Scanner sc = new Scanner(System.in)){
            System.out.print("月を入力：");
            if (sc.hasNextInt()) { // 整数が入力された場合
                int m = sc.nextInt();
                String name = month.get(m);
                if (name != null) {
                    System.out.println(name);
                }else{
                    System.out.println("対象の月はありません");
                }
            } else { // 整数以外が入力された場合
                System.out.println("整数を入力してください");
            }
        }
    }
}
