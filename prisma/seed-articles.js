const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SEED_ARTICLES = [
  {
    slug: "ra-mat-phong-thi-nghiem-steam-co-truyen",
    title: "Khai trương Phòng Thí Nghiệm Di Sản STEAM: Giao thoa giữa khoa học cổ truyền và công nghệ 3D",
    excerpt:
      "Không gian thực nghiệm độc đáo tái hiện phòng bào chế cổ với dụng cụ thiên văn bằng đồng, bình chưng cất thủy tinh và phương pháp mô phỏng vật lý chân thực nhất.",
    content:
      "Hôm nay, Project30TR chính thức mở cửa Phòng Thí Nghiệm Di Sản STEAM — một dự án mang tính đột phá kết hợp giữa tinh hoa kỹ nghệ truyền thống Việt Nam và đồ họa tương tác 3D thế hệ mới.\n\nTại đây, người học không chỉ được quan sát các mẫu vật cổ mà còn trực tiếp thao tác cầm nắm, đong đếm hóa chất thực nghiệm, hòa tan khoáng chất và điều chỉnh kính thiên văn cổ để quan sát tinh tú. Toàn bộ quy trình được cố vấn bởi các nhà nghiên cứu lịch sử và chuyên gia công nghệ giáo dục, mang lại trải nghiệm học tập sinh động và cuốn hút chưa từng có.",
    category: "TIN TỨC",
    author: "Hội Đồng Khảo Cứu",
    authorRole: "Ban Biên Tập",
    publishedAt: new Date("2026-10-09T08:30:00.000Z"),
    readTime: "5 phút đọc",
    coverImage: null,
    featured: true,
    hot: true,
    tags: ["STEAM", "Phòng thí nghiệm", "3D", "Di sản"],
    views: 1420,
  },
  {
    slug: "hai-trinh-kham-pha-thung-lung-karst",
    title: "Hải trình ghi chép địa đồ: Những bí ẩn chưa kể tại thung lũng đá vôi ngập sương",
    excerpt:
      "Đoàn thám hiểm ngược dòng sông ngầm ghi lại những thước phim và bản đồ cổ về cấu trúc địa chất karst độc nhất vô nhị tại vùng đệm di sản.",
    content:
      "Trong chuyến khảo sát kéo dài 10 ngày qua các nhánh sông uốn lượn giữa các rặng núi đá vôi sừng sững, đội ngũ nghiên cứu đã phát hiện nhiều dấu tích của các bậc tiền nhân từng sử dụng bè tre vận chuyển dược liệu và khoáng thạch cổ truyền.\n\nBản đồ địa hình 3D của khu vực này hiện đã được số hóa và đưa vào màn hình lựa chọn cấp độ bài học (Levels Map), cho phép học viên khám phá từng hang động kỳ thú ngay trên máy tính.",
    category: "KHÁM PHÁ",
    author: "Trần Thế An",
    authorRole: "Nhà Địa Lý Khảo Cứu",
    publishedAt: new Date("2026-10-08T03:15:00.000Z"),
    readTime: "4 phút đọc",
    coverImage: null,
    featured: false,
    hot: true,
    tags: ["Thám hiểm", "Địa chất", "Bản đồ"],
    views: 980,
  },
  {
    slug: "hoi-den-dinh-van-hoa-va-ngon-lua-chuoi",
    title: "Đại hội Đền Đình Văn Hóa: Thắp sáng ngọn lửa chuỗi cùng các sứ giả tri thức",
    excerpt:
      "Hàng trăm thành viên các nhóm học tập đã quy tụ tại buổi sinh hoạt truyền thống, cùng thưởng trà rồng lửa và ký giao ước giữ vững ngọn lửa học tập.",
    content:
      "Lễ hội văn hóa truyền thống mùa thu năm nay chứng kiến sự góp mặt của hơn 200 sứ giả học tập trẻ tuổi từ các nhóm thám hiểm trên khắp cả nước. Dưới tán cây cổ thụ và ánh đèn lồng rực rỡ, các bạn trẻ đã cùng nhau trao đổi bút tích, thử nghiệm các câu đố lịch sử và cam kết duy trì ngọn lửa chuỗi (Streak Keeper) liên tục trong 100 ngày tới.\n\nSự kiện khẳng định sức sống mãnh liệt của tinh thần hiếu học dân tộc trong kỷ nguyên số.",
    category: "CỘNG ĐỒNG",
    author: "Nguyễn Mai Linh",
    authorRole: "Điều Phối Viên Cộng Đồng",
    publishedAt: new Date("2026-10-06T11:45:00.000Z"),
    readTime: "3 phút đọc",
    coverImage: null,
    featured: false,
    hot: true,
    tags: ["Cộng đồng", "Hội đền", "Streak", "Văn hóa"],
    views: 1250,
  },
  {
    slug: "bi-thuat-che-tao-giay-do-co-truyen",
    title: "Bí thuật xeo giấy Dó và nghệ thuật lưu giữ bản thảo ngàn năm không phai",
    excerpt:
      "Tìm hiểu chuỗi phản ứng sinh hóa tự nhiên trong quá trình ngâm ủ vỏ cây Dó và công nghệ kiềm hóa giúp giấy có độ bền bỉ vượt thời gian.",
    content:
      "Từ ngàn năm trước, các nghệ nhân Việt đã làm chủ kỹ thuật sản xuất giấy Dó độc đáo không sử dụng axit — bí quyết giúp các sắc phong và kinh sách cổ trường tồn qua nhiều thế kỷ.\n\nTrong bài học STEAM tương tác tuần này, học sinh sẽ được tự tay thực hiện thao tác ngâm vỏ, giã bột và xeo giấy trên khung liềm tre trong môi trường mô phỏng vật lý chân thực.",
    category: "KHÁM PHÁ",
    author: "Lê Hoàng Bách",
    authorRole: "Chuyên Gia Phục Chế",
    publishedAt: new Date("2026-10-05T07:20:00.000Z"),
    readTime: "6 phút đọc",
    coverImage: null,
    featured: false,
    hot: false,
    tags: ["Giấy Dó", "Hóa học cổ truyền", "Thủ công"],
    views: 840,
  },
  {
    slug: "thuat-luyen-kim-va-ti-le-dong-thau-dong-son",
    title: "Huyền thoại trống đồng: Giải mã tỷ lệ hợp kim đồng - thiếc - chì của người Việt cổ",
    excerpt:
      "Phân tích quang phổ và cơ học đúc đồng chỉ ra đỉnh cao công nghệ luyện kim thời tiền sử vượt xa sự tưởng tượng của giới khảo cổ học.",
    content:
      "Các kết quả phân tích thành phần kim loại trên các hiện vật trống đồng Đông Sơn cho thấy người Việt cổ đã nắm vững tỷ lệ hợp kim lý tưởng: khoảng 70% đồng, 15% thiếc và 10% chì.\n\nTỷ lệ này giúp kim loại nóng chảy có độ nhớt thấp, dễ dàng điền đầy các hoa văn hình học siêu nhỏ và tạo ra âm vang vang dội khi đánh trống.",
    category: "KHÁM PHÁ",
    author: "TS. Phạm Quốc Hùng",
    authorRole: "Viện Nghiên Cứu Kim Loại",
    publishedAt: new Date("2026-10-03T14:10:00.000Z"),
    readTime: "7 phút đọc",
    coverImage: null,
    featured: false,
    hot: false,
    tags: ["Đông Sơn", "Luyện kim", "Vật lý"],
    views: 1690,
  },
  {
    slug: "ky-nghe-thuy-loi-va-he-thong-kenh-dao-co",
    title: "Trí tuệ thủy lợi cổ: Mô hình guồng nước và kênh đào dẫn nước qua triền núi",
    excerpt:
      "Khám phá nguyên lý thủy động lực học của chiếc guồng nước tre đan và ứng dụng bài toán năng lượng cơ học trong đời sống nông nghiệp truyền thống.",
    content:
      "Chiếc cọn nước (guồng nước) của đồng bào miền núi phía Bắc là một minh chứng xuất sắc cho việc sử dụng năng lượng tái tạo từ dòng chảy sông suối để đưa nước lên những thửa ruộng bậc thang cao hàng chục mét mà không cần bất kỳ động cơ nhân tạo nào.",
    category: "TIN TỨC",
    author: "Vũ Đình Trọng",
    authorRole: "Kỹ Sư Năng Lượng",
    publishedAt: new Date("2026-10-02T09:00:00.000Z"),
    readTime: "4 phút đọc",
    coverImage: null,
    featured: false,
    hot: false,
    tags: ["Thủy lợi", "Cọn nước", "Vật lý cổ"],
    views: 710,
  },
  {
    slug: "he-thong-quan-sat-thien-van-co-dai",
    title: "Nhìn sao đoán mùa vụ: Hệ thống 28 chòm sao Nhị Thập Bát Tú trong canh tác cổ xưa",
    excerpt:
      "Cách ông cha quan sát quỹ đạo mặt trăng và các chòm sao để dự báo thời tiết nông vụ, tính toán triều cường và thiết lập nông lịch chuẩn xác.",
    content:
      "Trước khi có vệ tinh khí tượng hiện đại, nông dân và các nhà thiên văn triều đình đã ghi chép cẩn thận sự vận hành của Nhị Thập Bát Tú và Bắc Đẩu Thất Tinh. Thông qua bài học thiên văn 3D mới, bạn có thể xoay quả cầu thiên cầu cổ để tìm hiểu vị trí từng chòm sao.",
    category: "KHÁM PHÁ",
    author: "Đặng Thu Hương",
    authorRole: "Nhà Thiên Văn Học",
    publishedAt: new Date("2026-10-01T16:30:00.000Z"),
    readTime: "5 phút đọc",
    coverImage: "/images/bgm23.jpg",
    featured: false,
    hot: false,
    tags: ["Thiên văn", "Nông lịch", "Vũ trụ"],
    views: 1120,
  },
  {
    slug: "men-ngoc-gom-su-thoi-ly-tran",
    title: "Khoa học trong gốm men ngọc (Celadon): Kỹ nghệ kiểm soát khí quyển lò nung khử oxy",
    excerpt:
      "Màu xanh ngọc bích huyền ảo của đồ gốm men Lý - Trần xuất phát từ quá trình nung khử ion sắt trong môi trường yếm khí ở nhiệt độ trên 1200°C.",
    content:
      "Các mảnh gốm men ngọc thời Lý được xem là tuyệt tác thủ công mỹ nghệ. Dưới góc nhìn hóa học vật liệu hiện đại, sắc xanh ngọc được hình thành do chuyển hóa Fe2O3 thành FeO trong môi trường thiếu oxy của lò bầu cổ truyền.",
    category: "KHÁM PHÁ",
    author: "Hồ Bá Khiêm",
    authorRole: "Nghệ Nhân Gốm",
    publishedAt: new Date("2026-09-28T10:15:00.000Z"),
    readTime: "5 phút đọc",
    coverImage: null,
    featured: false,
    hot: false,
    tags: ["Gốm sứ", "Hóa học", "Lý Trần"],
    views: 630,
  },
];

async function main() {
  for (const art of SEED_ARTICLES) {
    await prisma.article.upsert({
      where: { slug: art.slug },
      update: {
        title: art.title,
        excerpt: art.excerpt,
        content: art.content,
        category: art.category,
        author: art.author,
        authorRole: art.authorRole,
        publishedAt: art.publishedAt,
        readTime: art.readTime,
        coverImage: art.coverImage,
        featured: art.featured,
        hot: art.hot,
        tags: art.tags,
        views: art.views,
      },
      create: {
        slug: art.slug,
        title: art.title,
        excerpt: art.excerpt,
        content: art.content,
        category: art.category,
        author: art.author,
        authorRole: art.authorRole,
        publishedAt: art.publishedAt,
        readTime: art.readTime,
        coverImage: art.coverImage,
        featured: art.featured,
        hot: art.hot,
        tags: art.tags,
        views: art.views,
      },
    });
  }
  console.log("Đã nạp thành công các bài báo mẫu vào database!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
