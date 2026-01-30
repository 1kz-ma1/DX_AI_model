package Q13_3;
interface Person {
    void introduce();
}

class Teacher implements Person {  // 教員クラス
    private final String name;
    private final String subject;

    public Teacher(String name, String subject) {
        this.name = name;
        this.subject = subject;
    }

    @Override
    public void introduce() {  // オーバーライドして表示内容を具体化
        System.out.println("氏名：" + name);
        System.out.println("職種：教員");
        System.out.println("担当科目：" + subject);
    }
}

class Cook implements Person {
    private final String name;
    private final String special;

    public Cook(String name, String special) {
        this.name = name;
        this.special = special;
    }

    @Override
    public void introduce() {
        System.out.println("氏名：" + name);
        System.out.println("職種：シェフ");
        System.out.println("得意料理：" + special);
    }
}

public class Q13_3 {
    public static void main(String[] args) {
        Person t = new Teacher("竹井一馬", "情報処理");
        Person c = new Cook("大原太郎", "オムライス");

        t.introduce();
        System.out.println();
        c.introduce();
    }
}