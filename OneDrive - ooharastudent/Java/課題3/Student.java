
class Student {
    private String name;
    private String no;
    private int kokugo;
    private int sugaku;
    private int eigo;

    public Student(String name, String no, int kokugo, int sugaku, int eigo) {  // コンストラクタ
        this.name = name;
        this.no = no;
        this.kokugo = kokugo;
        this.sugaku = sugaku;
        this.eigo = eigo;
    }

    public String getName() { return name;}
    public String getNo() { return no;}
    public int getKokugo() { return kokugo;}
    public int getSugaku() { return sugaku;}
    public int getEigo() { return eigo;}

    public int getTotal(){
        return kokugo + sugaku + eigo;
    }

    public double getAverage(){
        double avg = getTotal() / 3.0;
        return Math.floor(avg * 100.0) / 100.0; // 小数点以下2桁で切り捨て
    }
}
