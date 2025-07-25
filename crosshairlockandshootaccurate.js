// ===== Vector3 Class =====
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
  }
  add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
  subtract(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
  multiplyScalar(s) { return new Vector3(this.x * s, this.y * s, this.z * s); }

  applyMatrix4(m) {
    const e = m.elements;
    const x = this.x, y = this.y, z = this.z;
    const nx = e[0] * x + e[4] * y + e[8] * z + e[12];
    const ny = e[1] * x + e[5] * y + e[9] * z + e[13];
    const nz = e[2] * x + e[6] * y + e[10] * z + e[14];
    return new Vector3(nx, ny, nz);
  }

  distanceTo(v) {
    const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  toFixed(d = 4) {
    return `x:${this.x.toFixed(d)} y:${this.y.toFixed(d)} z:${this.z.toFixed(d)}`;
  }
}

// ===== Quaternion Class =====
class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x; this.y = y; this.z = z; this.w = w;
  }

  multiplyVector3(v) {
    const qx = this.x, qy = this.y, qz = this.z, qw = this.w;
    const x = v.x, y = v.y, z = v.z;

    const ix =  qw * x + qy * z - qz * y;
    const iy =  qw * y + qz * x - qx * z;
    const iz =  qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;

    return new Vector3(
      ix * qw + iw * -qx + iy * -qz - iz * -qy,
      iy * qw + iw * -qy + iz * -qx - ix * -qz,
      iz * qw + iw * -qz + ix * -qy - iy * -qx
    );
  }
}

// ===== Matrix4 Class =====
class Matrix4 {
  constructor(elements = null) {
    this.elements = elements || new Float32Array([
      1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1
    ]);
  }

  compose(position, quaternion, scale) {
    const {x,y,z,w} = quaternion;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, yy = y * y2, zz = z * z2;
    const xy = x * y2, xz = x * z2, yz = y * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    const te = this.elements;
    te[0] = (1 - (yy + zz)) * scale.x; te[1] = (xy + wz) * scale.x; te[2] = (xz - wy) * scale.x; te[3] = 0;
    te[4] = (xy - wz) * scale.y; te[5] = (1 - (xx + zz)) * scale.y; te[6] = (yz + wx) * scale.y; te[7] = 0;
    te[8] = (xz + wy) * scale.z; te[9] = (yz - wx) * scale.z; te[10] = (1 - (xx + yy)) * scale.z; te[11] = 0;
    te[12] = position.x; te[13] = position.y; te[14] = position.z; te[15] = 1;
    return this;
  }
}

// ===== BoneHeadTracker Class =====
class BoneHeadTracker {
  constructor(bindposeData, boneHeadData) {
    this.bindposeMatrix = bindposeData ? Matrix4.fromBindpose?.(bindposeData) || null : null;

    if (boneHeadData) {
      this.boneHeadPosition = new Vector3(
        boneHeadData.position.x,
        boneHeadData.position.y,
        boneHeadData.position.z
      );
      this.boneHeadRotation = new Quaternion(
        boneHeadData.rotation.x,
        boneHeadData.rotation.y,
        boneHeadData.rotation.z,
        boneHeadData.rotation.w
      );
      this.boneHeadScale = new Vector3(
        boneHeadData.scale.x,
        boneHeadData.scale.y,
        boneHeadData.scale.z
      );
      this.boneHeadMatrix = new Matrix4().compose(
        this.boneHeadPosition,
        this.boneHeadRotation,
        this.boneHeadScale
      );
    } else {
      this.boneHeadMatrix = null;
    }
  }

  getHeadPositionFromBindpose(offset = new Vector3(0, 0, 0)) {
    if (!this.bindposeMatrix) return null;
    return offset.applyMatrix4(this.bindposeMatrix);
  }

  getHeadPositionFromBoneData(offset = new Vector3(0, 0, 0)) {
    if (!this.boneHeadMatrix) return null;

    const rotatedOffset = this.boneHeadRotation.multiplyVector3(offset);
    return this.boneHeadPosition.add(rotatedOffset);
  }
}

// ===== CrosshairLock Class =====
class CrosshairLock {
  constructor() {
    this.crosshair = new Vector3(400, 300, 0);
  }

  lockTo(target, threshold = 0.005) {
    const dist = this.crosshair.distanceTo(target);
    if (dist <= threshold) {
      return true;
    } else {
      this.crosshair = target;
      return false;
    }
  }

  getPosition() {
    return this.crosshair;
  }
}

// ===== TriggerShoot Class =====
class TriggerShoot {
  constructor() {
    this.isShooting = false;
  }

  tryShoot(isLocked) {
    if (isLocked && !this.isShooting) {
      this.isShooting = true;
      console.log("🔫 Trigger SHOOT!");
    }
    if (!isLocked && this.isShooting) {
      this.isShooting = false;
      console.log("✋ STOP shooting");
    }
  }
}

// ===== Các biến quản lý trạng thái smoothing, prediction, reset =====
let lockedTarget = null;
let targetHistory = [];
const smoothingFactor = 0.3;
const predictionFactor = 2;
const headLockRange = 100;
const resetRange = 120;

// Giả lập trạng thái màu tâm ngắm
let isCrosshairRed = true;

// Hàm tính vận tốc
function computeVelocity(current, last) {
  return new Vector3(
    current.x - last.x,
    current.y - last.y,
    current.z - last.z
  );
}

// Hàm dự đoán vị trí mục tiêu
function predictPosition(current, velocity, factor) {
  return new Vector3(
    current.x + velocity.x * factor,
    current.y + velocity.y * factor,
    current.z + velocity.z * factor
  );
}

// Hàm làm mượt delta (drag aim)
function smoothDelta(prevDelta, newDelta, factor) {
  return new Vector3(
    prevDelta.x + (newDelta.x - prevDelta.x) * factor,
    prevDelta.y + (newDelta.y - prevDelta.y) * factor,
    prevDelta.z + (newDelta.z - prevDelta.z) * factor
  );
}

// Demo data (có thể thay bằng data thật)
const bindposeData = {
  e00: -1.34559613e-13, e01: 8.881784e-14, e02: -1.0, e03: 0.487912,
  e10: -2.84512817e-6, e11: -1.0, e12: 8.881784e-14, e13: -2.842171e-14,
  e20: -1.0, e21: 2.84512817e-6, e22: -1.72951931e-13, e23: 0.0,
  e30: 0.0, e31: 0.0, e32: 0.0, e33: 1.0
};

const demoBoneHeads = [
  {
    position: { x: -0.0456970781, y: -0.004478302, z: -0.0200432576 },
    rotation: { x: 0.0258174837, y: -0.08611039, z: -0.1402113, w: 0.9860321 },
    scale: { x: 0.99999994, y: 1.00000012, z: 1.0 }
  },
];

// Các vị trí head offset (có thể thêm)
const headOffsets = {
  forehead: new Vector3(0, 0.15, 0),
  eyes: new Vector3(0, 0.05, 0.05),
  top: new Vector3(0, 0.2, 0),
  chin: new Vector3(0, -0.1, 0),
};

const crosshairLock = new CrosshairLock();
const triggerShoot = new TriggerShoot();

// Hàm chọn target head gần nhất với crosshair, trong phạm vi lock
function chooseBestHeadTarget(crosshair) {
  let bestTarget = null;
  let minDistance = Infinity;

  for (const enemy of demoBoneHeads) {
    const tracker = new BoneHeadTracker(bindposeData, enemy);
    for (const key in headOffsets) {
      const offset = headOffsets[key];
      const rotatedOffset = tracker.boneHeadRotation.multiplyVector3(offset);
      const targetPos = tracker.boneHeadPosition.add(rotatedOffset);

      const dist = crosshair.distanceTo(targetPos);
      if (dist < minDistance && dist < headLockRange) {
        minDistance = dist;
        bestTarget = targetPos;
      }
    }
  }

  return bestTarget;
}

// ===== Vòng lặp chính =====
function mainLoop() {
  if (!isCrosshairRed) {
    lockedTarget = null;
    targetHistory = [];
    setTimeout(mainLoop, 16);
    return;
  }

  const crosshair = crosshairLock.getPosition();

  let bestTarget = chooseBestHeadTarget(crosshair);

  if (!bestTarget) {
    lockedTarget = null;
    targetHistory = [];
    setTimeout(mainLoop, 16);
    return;
  }

  let velocity = new Vector3(0, 0, 0);
  if (targetHistory.length > 0) {
    velocity = computeVelocity(bestTarget, targetHistory[targetHistory.length - 1]);
  }

  let predictedPos = predictPosition(bestTarget, velocity, predictionFactor);

  let aimDelta = new Vector3(
    predictedPos.x - crosshair.x,
    predictedPos.y - crosshair.y,
    0
  );

  if (lockedTarget && lockedTarget.aimDelta) {
    aimDelta = smoothDelta(lockedTarget.aimDelta, aimDelta, smoothingFactor);
  }

  const newCrosshair = crosshair.add(aimDelta);
  crosshairLock.crosshair = newCrosshair;

  if (newCrosshair.distanceTo(bestTarget) > resetRange) {
    lockedTarget = null;
    targetHistory = [];
    setTimeout(mainLoop, 16);
    return;
  }

  lockedTarget = {
    position: bestTarget,
    aimDelta: aimDelta,
    timestamp: Date.now()
  };

  targetHistory.push(bestTarget);
  if (targetHistory.length > 10) targetHistory.shift();

  if (aimDelta.distanceTo(new Vector3(0, 0, 0)) < 1) {
    triggerShoot.tryShoot(true);
  } else {
    triggerShoot.tryShoot(false);
  }

class AimbotConfig {
  constructor() {
    this.enabled = true;
    this.autoShoot = true;
    this.teamCheck = true;
    this.fov = 360;
    this.smoothing = 0.0; // Immediate tracking
    this.prediction = 0;
    this.maxDistance = 9999;
    this.headPriority = 1.0;
    this.preferClosest = true;
    this.maxTargetHistory = 5;
    this.humanization = false;
   
  }
}

// ===== AimbotEngine Gộp TargetManager + BoneHeadTracker =====
class AimbotEngine {
  constructor(config = new AimbotConfig()) {
    this.config = config;
    this.enemies = [];
    this.playerPosition = new Vector3();
    this.lastTarget = null;
    this.headPosition = new Vector3();
  }

  updateEnemies(enemyList) {
    this.enemies = enemyList.filter(e => e && e.health > 0 && e.boneHead);
  }

  updatePlayerPosition(pos) {
    this.playerPosition = new Vector3(pos.x, pos.y, pos.z);
  }

  getNearestEnemy() {
    let closest = null;
    let minDist = Infinity;
    for (const enemy of this.enemies) {
      const dist = this.playerPosition.distanceTo(enemy.position);
      if (dist < minDist && dist <= this.config.maxDistance) {
        closest = enemy;
        minDist = dist;
      }
    }
    return closest;
  }

  computeHeadPosition(bone) {
    if (!bone || !bone.position || !bone.rotation || !bone.scale) return new Vector3();
    const matrix = new Matrix4().compose(
      new Vector3(bone.position.x, bone.position.y, bone.position.z),
      new Quaternion(bone.rotation.x, bone.rotation.y, bone.rotation.z, bone.rotation.w),
      new Vector3(bone.scale.x, bone.scale.y, bone.scale.z)
    );
    const headOffset = new Vector3( -0.04089227, 0.00907892,0.02748467);
    return headOffset.applyMatrix4(matrix);
  }

  getAimPoint() {
    const target = this.getNearestEnemy();
    if (!target) return null;
    this.lastTarget = target;
    this.headPosition = this.computeHeadPosition(target.boneHead);
    return this.headPosition.clone();
  }
}

// ===== Khởi Tạo & Kiểm Tra =====
const config = new AimbotConfig();
const engine = new AimbotEngine(config);

// Giả lập enemy và player
const enemies = [
  {
    health: 100,
    position: new Vector3(10, 0, 20),
    boneHead: {
      position: {x: -0.0456970781, y: -0.004478302, z: -0.0200432576},
      rotation: {x: 0.0258174837, y: -0.08611039, z: -0.1402113, w: 0.9860321},
      scale: {x: 0.99999994, y: 1.00000012, z:1.0}
    }
  }
];
const playerPos = { x: 0, y: 0, z: 0 };

// Cập nhật và lấy tọa độ
engine.updateEnemies(enemies);
engine.updatePlayerPosition(playerPos);
const aimPoint = engine.getAimPoint();

if (aimPoint) {
  console.log("🎯 Aim Head:", aimPoint.x.toFixed(3), aimPoint.y.toFixed(3), aimPoint.z.toFixed(3));
}

  console.log("🎯 Crosshair:", newCrosshair.toFixed());
  console.log("🎯 Target (predicted):", predictedPos.toFixed());
  console.log("🔒 Locked:", true);

  setTimeout(mainLoop, 8);
}

console.log("✅ Shadowrocket Headlock Aimbot Ready!");

// Khởi động vòng lặp
console.log("🚀 Khởi động hệ thống tracking + smoothing + prediction + trigger...");
mainLoop();
