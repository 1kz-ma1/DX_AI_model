package Q13_1;
class Teacher extends Person {  // 教員クラス
    private String subject;

    public Teacher(String name, String subject) { // コンストラクタ
        super(name);
        this.subject = subject;
    }

    @Override
    public void introduce() {  // オーバーライドして表示内容を具体化
        System.out.println("氏名：" + name);
        System.out.println("職種：教員");
        System.out.println("担当科目：" + subject);
    }

}