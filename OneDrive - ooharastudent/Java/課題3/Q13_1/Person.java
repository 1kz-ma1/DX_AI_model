package Q13_1;
abstract class Person {  // 人クラス
    protected String name;

    public Person(String name) {  // コンストラクタ
        this.name = name;
    }

    public abstract void introduce();    // 各職種での表示内容を具体化
}
