/*
 Copyright (c) 2026 John Talbot. All rights reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

// import * as THREE from 'three';


// ==========================================
// SHARED ASSETS & HELPERS
// ==========================================
function createAirplane() {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.ConeGeometry(0.2, 1, 32);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Wings
    const wingGeo = new THREE.BoxGeometry(2, 0.1, 0.4);
    const wingMat = new THREE.MeshPhongMaterial({ color: 0xcccccc });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    group.add(wings);

    // Tail
    const tailGeo = new THREE.BoxGeometry(0.6, 0.1, 0.3);
    tailGeo.translate(0, 0, 0.4);
    const tail = new THREE.Mesh(tailGeo, wingMat);
    tail.position.set(0, 0, 0); // Already offset geometry
    group.add(tail);

    const rudderGeo = new THREE.BoxGeometry(0.1, 0.4, 0.3);
    rudderGeo.translate(0, 0.2, 0.4);
    const rudder = new THREE.Mesh(rudderGeo, wingMat);
    group.add(rudder);

    // Axis Helper
    const axesHelper = new THREE.AxesHelper(1.5);
    group.add(axesHelper);

    return group;
}

// ==========================================
// SCENE 1: EULER / GIMBAL
// ==========================================
function initEulerScene() {
    const container = document.getElementById('euler-canvas');
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(2.5, 2, 3.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // --- GIMBAL HIERARCHY ---
    // Standard Rotation Order for this demo: Y-X-Z (Yaw, Pitch, Roll) 
    // Usually Gimbal setups in tutorials use this visuals:
    // Outer Ring (Fixed to World Y?) -> Pitch Ring -> Roll Ring -> Object 
    // Let's implement: Y (Outer, Green) -> X (Middle, Red) -> Z (Inner, Blue)

    // 1. Root (Fixed)
    const gimbalRoot = new THREE.Group();
    scene.add(gimbalRoot);

    // 2. Outer Ring (Y-Axis / Yaw) - Green
    const outerRingGeo = new THREE.TorusGeometry(1.4, 0.05, 16, 100);
    outerRingGeo.rotateX(Math.PI / 2); // Lay flat initially
    const outerRingMat = new THREE.MeshPhongMaterial({ color: 0x55ff55 });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    gimbalRoot.add(outerRing); // Rotates around Y

    // 3. Middle Ring (X-Axis / Pitch) - Red
    // It is a child of Outer Ring, so it moves when Outer moves.
    const middleRingGeo = new THREE.TorusGeometry(1.2, 0.05, 16, 100);
    // Orient so it rotates around local X
    // Default torus is in XY plane. 
    const middleRingMat = new THREE.MeshPhongMaterial({ color: 0xff5555 });
    const middleRing = new THREE.Mesh(middleRingGeo, middleRingMat);
    outerRing.add(middleRing);

    // 4. Inner Ring (Z-Axis / Roll) - Blue
    // Child of Middle Ring
    const innerRingGeo = new THREE.TorusGeometry(1.0, 0.05, 16, 100);
    innerRingGeo.rotateY(Math.PI / 2); // Orient for Z rotation
    const innerRingMat = new THREE.MeshPhongMaterial({ color: 0x5555ff });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    middleRing.add(innerRing);

    // 5. The Object (Airplane)
    // Child of Inner Ring
    const airplane = createAirplane();
    innerRing.add(airplane);


    // --- UI LOGIC ---
    const sliderX = document.getElementById('euler-x');
    const sliderY = document.getElementById('euler-y');
    const sliderZ = document.getElementById('euler-z');
    const valX = document.getElementById('val-x');
    const valY = document.getElementById('val-y');
    const valZ = document.getElementById('val-z');
    const btnLock = document.getElementById('btn-lock');

    // SMOOTH ANIMATION STATE
    let currentRot = { x: 0, y: 0, z: 0 };
    let targetRot = { x: 0, y: 0, z: 0 };

    function updateRotation() {
        const xDeg = parseFloat(sliderX.value);
        const yDeg = parseFloat(sliderY.value);
        const zDeg = parseFloat(sliderZ.value);

        // Update Text immediately
        valX.textContent = xDeg + '°';
        valY.textContent = yDeg + '°';
        valZ.textContent = zDeg + '°';

        // Set Targets
        targetRot.x = xDeg;
        targetRot.y = yDeg;
        targetRot.z = zDeg;
    }

    // Listeners
    sliderX.addEventListener('input', updateRotation);
    sliderY.addEventListener('input', updateRotation);
    sliderZ.addEventListener('input', updateRotation);

    btnLock.onclick = () => {
        sliderX.value = 90; // Pitch 90
        sliderY.value = 0;
        sliderZ.value = 0;
        updateRotation();
    };

    // Anim Loop
    function animate() {
        requestAnimationFrame(animate);

        // Interpolation
        // Simple lerp: current = current + (target - current) * 0.1
        currentRot.x += (targetRot.x - currentRot.x) * 0.1;
        currentRot.y += (targetRot.y - currentRot.y) * 0.1;
        currentRot.z += (targetRot.z - currentRot.z) * 0.1;

        // Apply Rotations to the Hierarchy
        // Outer (Y)
        outerRing.rotation.y = THREE.MathUtils.degToRad(currentRot.y);
        // Middle (X)
        middleRing.rotation.x = THREE.MathUtils.degToRad(currentRot.x);
        // Inner (Z)
        innerRing.rotation.z = THREE.MathUtils.degToRad(currentRot.z);

        renderer.render(scene, camera);
    }
    animate();

    // Resize
    window.addEventListener('resize', () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    });
}



// ==========================================
// SCENE 2: QUATERNION
// ==========================================
function initQuatScene() {
    const container = document.getElementById('quat-canvas');
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 3); // Closer for larger view

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0x404040));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(1, 1, 1);
    scene.add(dirLight);

    // Object
    const airplane = createAirplane();
    scene.add(airplane);

    // Controls
    // We use a simple mouse drag logic to rotate object via quaternion.

    // Manual Implementation of simple Arcball (Mouse drag -> Axis/Angle -> Quat):
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    // Slider References
    const sliderQx = document.getElementById('quat-x');
    const sliderQy = document.getElementById('quat-y');
    const sliderQz = document.getElementById('quat-z');
    const sliderQw = document.getElementById('quat-w');

    // Text References
    const valQx = document.getElementById('val-qx');
    const valQy = document.getElementById('val-qy');
    const valQz = document.getElementById('val-qz');
    const valQw = document.getElementById('val-qw');

    // SMOOTH ANIMATION
    let currentQuat = new THREE.Quaternion();
    let targetQuat = new THREE.Quaternion();

    function updateFromSliders() {
        let x = parseFloat(sliderQx.value);
        let y = parseFloat(sliderQy.value);
        let z = parseFloat(sliderQz.value);
        let w = parseFloat(sliderQw.value);

        const q = new THREE.Quaternion(x, y, z, w);
        if (q.lengthSq() === 0) q.w = 1;
        q.normalize();

        // Instead of setting directly, we set target
        targetQuat.copy(q);

        // We defer UI update to the animation loop or update it here based on target?
        // Actually, if we update UI from currentQuat in loop, sliders will move.
        // But here we are moving sliders to set target.
        // Let's just update text values here to match sliders
        valQx.textContent = q.x.toFixed(2);
        valQy.textContent = q.y.toFixed(2);
        valQz.textContent = q.z.toFixed(2);
        valQw.textContent = q.w.toFixed(2);
    }

    function updateUIValues() {
        const q = airplane.quaternion;

        valQx.textContent = q.x.toFixed(2);
        valQy.textContent = q.y.toFixed(2);
        valQz.textContent = q.z.toFixed(2);
        valQw.textContent = q.w.toFixed(2);

        // NOTE: We don't update slider values here to avoid fighting the user input
        // unless we are in a "reset" or "drag" event not initiated by sliders.
    }

    // Slider Listeners
    [sliderQx, sliderQy, sliderQz, sliderQw].forEach(s => {
        s.addEventListener('input', updateFromSliders);
    });

    // MOUSE EVENTS ON CANVAS
    renderer.domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
    });
    renderer.domElement.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaMove = {
            x: e.offsetX - previousMousePosition.x,
            y: e.offsetY - previousMousePosition.y
        };

        if (eventIsInside(e)) {
            const deltaRotationQuaternion = new THREE.Quaternion()
                .setFromEuler(new THREE.Euler(
                    THREE.MathUtils.degToRad(deltaMove.y * 1),
                    THREE.MathUtils.degToRad(deltaMove.x * 1),
                    0,
                    'XYZ'
                ));

            // Apply to TARGET
            targetQuat.multiplyQuaternions(deltaRotationQuaternion, targetQuat);
            targetQuat.multiplyQuaternions(deltaRotationQuaternion, targetQuat); // Why twice? Legacy code kept it.

            // Sync current immediately for responsiveness or let it lag? 
            // Better to let it slerp for smoothness, but mouse drag usually expects immediate feedback.
            // Let's keep it smooth but fast.
        }

        previousMousePosition = {
            x: e.offsetX,
            y: e.offsetY
        };
    });

    window.addEventListener('mouseup', () => isDragging = false);

    // Initial mouse pos setup
    renderer.domElement.addEventListener('mousedown', (e) => {
        previousMousePosition = { x: e.offsetX, y: e.offsetY };
        // Sync target to current when starting interaction to avoid jumps
        targetQuat.copy(airplane.quaternion);
    });


    function eventIsInside(e) { return true; }

    document.getElementById('btn-reset-quat').addEventListener('click', () => {
        targetQuat.set(0, 0, 0, 1);
        // visual update happens in loop
    });

    function animate() {
        requestAnimationFrame(animate);

        // Slerp to target
        airplane.quaternion.slerp(targetQuat, 0.1);

        // Update UI if we are animating (optional, but good for reset)
        // Check if close
        if (!isDragging) { // Don't fight sliders while dragging
            // Actually, updateUIValues doesn't touch sliders anymore in my mod above
            // so it's safe to call to update TEXT values
            // But valid only if we want text to show CURRENT animation state
            updateUIValues();
        }

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    });
}

// Init
initEulerScene();
initQuatScene();
