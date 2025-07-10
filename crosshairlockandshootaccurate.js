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
    return {
      x: this.x.toFixed(d),
      y: this.y.toFixed(d),
      z: this.z.toFixed(d)
    };
  }
}

// ===== Quaternion Class =====
class Quaternion {
  constructor(x, y, z, w) {
    this.x = x; this.y = y; this.z = z; this.w = w;
  }
}

// ===== Matrix4 Class =====
class Matrix4 {
  constructor(elements = null) {
    this.elements = elements || new Float32Array(16).fill(0);
  }

  static fromBindpose(data) {
    // Chuyển bindpose object thành ma trận 4x4
    const e = new Float32Array(16);
    e[0] = data.e00; e[1] = data.e10; e[2] = data.e20; e[3] = data.e30;
    e[4] = data.e01; e[5] = data.e11; e[6] = data.e21; e[7] = data.e31;
    e[8] = data.e02; e[9] = data.e12; e[10] = data.e22; e[11] = data.e32;
    e[12] = data.e03; e[13] = data.e13; e[14] = data.e23; e[15] = data.e33;
    return new Matrix4(e);
  }

  compose(position, quaternion, scale) {
    const x = quaternion.x, y = quaternion.y, z = quaternion.z, w = quaternion.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, yy = y * y2, zz = z * z2;
    const xy = x * y2, xz = x * z2, yz = y * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    const te = this.elements;
    te[0] = (1 - (yy + zz)) * scale.x;
    te[1] = (xy + wz) * scale.x;
    te[2] = (xz - wy) * scale.x;
    te[3] = 0;

    te[4] = (xy - wz) * scale.y;
    te[5] = (1 - (xx + zz)) * scale.y;
    te[6] = (yz + wx) * scale.y;
    te[7] = 0;

    te[8] = (xz + wy) * scale.z;
    te[9] = (yz - wx) * scale.z;
    te[10] = (1 - (xx + yy)) * scale.z;
    te[11] = 0;

    te[12] = position.x;
    te[13] = position.y;
    te[14] = position.z;
    te[15] = 1;

    return this;
  }
}

// ===== BoneHeadTracker Class =====
class BoneHeadTracker {
  constructor(bindposeData, boneHeadData) {
    this.bindposeMatrix = bindposeData ? Matrix4.fromBindpose(bindposeData) : null;

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
    return offset.applyMatrix4(this.boneHeadMatrix);
  }
}

// ===== CrosshairLock Class =====
class CrosshairLock {
  constructor() {
    this.crosshair = new Vector3(0, 0, 0);
  }

  lockTo(target, threshold = 0.005) {
    const dist = this.crosshair.distanceTo(target);
    if (dist <= threshold) {
      // Đã lock chính xác
      return true;
    } else {
      // Cập nhật crosshair tiến gần target
      this.crosshair = target;
      return false;
    }
  }

  getPosition() {
    return this.crosshair;
  }
}

// ===== TriggerShoot Class (ví dụ) =====
class TriggerShoot {
  constructor() {
    this.isShooting = false;
  }

  tryShoot(isLocked) {
    if (isLocked && !this.isShooting) {
      this.isShooting = true;
      console.log("🔫 Trigger SHOOT!");
      // Ở đây bạn có thể tích hợp gọi API hoặc thao tác bắn thực tế
    }
    if (!isLocked && this.isShooting) {
      this.isShooting = false;
      console.log("✋ STOP shooting");
    }
  }
}

// ===== Demo sử dụng =====
const bindposeData = {
  e00: -1.34559613e-13, e01: 8.881784e-14, e02: -1.0, e03: 0.487912,
  e10: -2.84512817e-6, e11: -1.0, e12: 8.881784e-14, e13: -2.842171e-14,
  e20: -1.0, e21: 2.84512817e-6, e22: -1.72951931e-13, e23: 0.0,
  e30: 0.0, e31: 0.0, e32: 0.0, e33: 1.0
};

const boneHeadData = {
  position: { x: -0.0456970781, y: -0.004478302, z: -0.0200432576 },
  rotation: { x: 0.0258174837, y: -0.08611039, z: -0.1402113, w: 0.9860321 },
  scale: { x: 0.99999994, y: 1.00000012, z: 1.0 }
};

const headTracker = new BoneHeadTracker(bindposeData, boneHeadData);
const crosshairLock = new CrosshairLock();
const triggerShoot = new TriggerShoot();

// Offset nếu muốn căn chỉnh vị trí head chính xác hơn (vd: nâng lên 0.15 unit)
const headOffset = new Vector3(0, 0.15, 0);

function mainLoop() {
  // Lấy vị trí head từ bindpose
  const headPosBindpose = headTracker.getHeadPositionFromBindpose(headOffset);
  // Lấy vị trí head từ bone head data
  const headPosBoneData = headTracker.getHeadPositionFromBoneData(headOffset);

  // Chọn 1 trong 2 (hoặc trung bình)
  let targetPos;
  if (headPosBoneData) {
    targetPos = headPosBoneData;
  } else if (headPosBindpose) {
    targetPos = headPosBindpose;
  } else {
    console.warn("Không có dữ liệu vị trí head");
    return;
  }

  // Lock crosshair vào vị trí head
  const isLocked = crosshairLock.lockTo(targetPos);

  // Bắn khi lock chính xác
  triggerShoot.tryShoot(isLocked);

  // Log trạng thái
  console.log("Crosshair:", crosshairLock.getPosition().toFixed());
  console.log("Target Head:", targetPos.toFixed());
  console.log("Locked:", isLocked);

  // Tiếp tục vòng lặp
  setTimeout(mainLoop, 16); // ~60fps
}

console.log("🚀 Bắt đầu Bone Head Tracking + Auto Shoot");
mainLoop();
