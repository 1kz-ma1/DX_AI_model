package Q13_1;
public class Q13_1 {
    public static void main(String[] args) {
        Person t = new Teacher("竹井一馬", "情報処理"); // Teacherクラスのインスタンスを作成
        Person c = new Cook("大原太郎", "オムライス"); // Cookクラスのインスタンスを作成

        t.introduce();
        System.out.println();
        c.introduce();
    }
}
