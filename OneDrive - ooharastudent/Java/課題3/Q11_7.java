public class Q11_7 {
    public static void main(String[] args) {
        Student s1 = new Student("A", "001", 89, 65, 88);  // 名前、番号、国語、数学、英語の点数を渡してインスタンス化
        Student s2 = new Student("B", "002", 80, 95, 64);
        Student s3 = new Student("C", "003", 70, 80, 98);
        printRow(s1);
        printRow(s2);
        printRow(s3);
    }
    private static void printRow(Student s){
        System.out.printf("%s番 %sさん 平均点 %.2f%n", s.getNo(), s.getName(), s.getAverage());
    }
}

