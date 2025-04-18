let scene = 0;
let lovePoints = 0;

const scenes = [
  {
    text: "คุณเจอเมย์ยืนรอรถเมล์คนเดียว",
    choices: [
      { text: "เข้าไปคุย", points: 2 },
      { text: "ยิ้มให้ห่าง ๆ", points: 1 },
      { text: "มองแล้วเดินผ่าน", points: 0 },
      { text: "แกล้งทำเป็นไม่เห็น", points: -1 }
    ]
  },
  {
    text: "เมย์ถามว่า คุณชอบดูหนังแนวไหน?",
    choices: [
      { text: "โรแมนติก", points: 2 },
      { text: "แอคชั่น", points: 1 },
      { text: "สยองขวัญ", points: 0 },
      { text: "ไม่ชอบดูหนัง", points: -1 }
    ]
  },
  {
    text: "เมย์ส่งข้อความชวนคุยตอนดึก",
    choices: [
      { text: "รีบตอบกลับ", points: 2 },
      { text: "ตอบช้า ๆ", points: 1 },
      { text: "ไม่ตอบเลย", points: -1 },
      { text: "บล็อกไปเลย", points: -3 }
    ]
  },
  {
    text: "วันเกิดเมย์ คุณจะ...",
    choices: [
      { text: "ให้ของขวัญพิเศษ", points: 2 },
      { text: "พาไปกินข้าว", points: 1 },
      { text: "ส่งข้อความแค่ 'HBD'", points: 0 },
      { text: "ลืมวันเกิดเธอ", points: -2 }
    ]
  }
];

// จัดการแสดงผล
function showScene() {
  const sceneText = document.getElementById("scene-text");
  const choicesContainer = document.getElementById("choices-container");

  choicesContainer.innerHTML = ""; // ล้างปุ่มก่อนหน้า

  if (scene < scenes.length) {
    const current = scenes[scene];
    sceneText.textContent = current.text;

    current.choices.forEach(choice => {
      const btn = document.createElement("button");
      btn.textContent = choice.text;
      btn.onclick = () => {
        lovePoints += choice.points;
        scene++;
        showScene();
      };
      choicesContainer.appendChild(btn);
    });

  } else {
    // ตอนจบ
    if (lovePoints >= 7) {
      sceneText.textContent = "เมย์: เราว่าชอบเธอเหมือนกันนะ... (จบแบบรักแท้)";
    } else if (lovePoints >= 4) {
      sceneText.textContent = "เมย์: ไว้เราไปกินข้าวกันอีกนะ (จบแบบเพื่อนสนิท)";
    } else {
      sceneText.textContent = "เมย์: เราว่าเราเป็นเพื่อนกันดีกว่า... (จบแบบเฟรนด์โซน)";
    }
  }
}

window.onload = showScene;