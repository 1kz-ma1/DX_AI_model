import java.util.Scanner;
public class Q12_1 {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("整数を入力してください：");
        int num1 = sc.nextInt();
        System.out.print("整数を入力してください：");
        int num2 = sc.nextInt();
        
        MoreCalc calc = new MoreCalc(); // MoreCalcクラスのインスタンスを作成
        
        System.out.println("Sum " + num1 + " and " + num2 + " = " + calc.CalcSum(num1, num2));
        System.out.println("Average " + num1 + " and " + num2 + " = " + calc.CalcAve(num1, num2));
        System.out.println("Power " + num1 + " of " + num2 + " = " + calc.CalcPow(num1, num2));

        sc.close();
    }
}
