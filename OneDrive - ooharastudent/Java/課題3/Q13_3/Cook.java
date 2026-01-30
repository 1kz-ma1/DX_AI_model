package Q13_3;

class Cook implements Person { // シェフクラス
    private final String name;
    private final String special;
    public Cook(String name, String special) { this.name = name; this.special = special; }
    @Override public void introduce() {  // オーバーライドして表示内容を具体化
        System.out.println("氏名：" + name);
        System.out.println("職種：シェフ");
        System.out.println("得意料理：" + special);
    }
}
