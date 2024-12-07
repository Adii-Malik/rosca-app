import React, { useEffect, useRef } from "react";

const WheelOfPrizes = ({ isSpinning, eligibleUsers, onSpinStatusChange }) => {
  const canvasRef = useRef(null);
  const spinButtonClickedRef = useRef(false); // To handle the spin event internally

  // State variables for spinning
  let sectors = [];
  const PI = Math.PI;
  const TAU = 2 * PI;
  let angVel = 0; // Angular velocity
  let ang = 0; // Angle in radians
  const friction = 0.995; // Deceleration factor

  const rand = (min, max) => Math.random() * (max - min) + min;

  const getIndex = () => Math.floor(sectors.length - (ang / TAU) * sectors.length) % sectors.length;

  const drawSector = (ctx, sector, i) => {
    const rad = ctx.canvas.width / 2;
    const arc = TAU / sectors.length;
    const ang = arc * i;

    ctx.save();

    // Color
    ctx.beginPath();
    ctx.fillStyle = sector.color;
    ctx.moveTo(rad, rad);
    ctx.arc(rad, rad, rad, ang, ang + arc);
    ctx.lineTo(rad, rad);
    ctx.fill();

    // Text
    ctx.translate(rad, rad);
    ctx.rotate(ang + arc / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = sector.text;
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(sector.label, rad - 10, 10);

    ctx.restore();
  };

  const rotate = (ctx) => {
    ctx.canvas.style.transform = `rotate(${ang - PI / 2}rad)`;
  };

  const frame = (ctx) => {
    if (!angVel && spinButtonClickedRef.current) {
      // When the wheel stops spinning
      const finalSector = sectors[getIndex()];
      console.log(`You landed on: ${finalSector.label}`);
      spinButtonClickedRef.current = false;

      // Notify the parent that spinning has stopped
      onSpinStatusChange(false);

      return;
    }

    angVel *= friction; // Apply friction to angular velocity
    if (angVel < 0.002) angVel = 0; // Stop when slow enough
    ang += angVel; // Update angle
    ang %= TAU; // Normalize angle
    rotate(ctx);
  };

  const engine = (ctx) => {
    frame(ctx);
    requestAnimationFrame(() => engine(ctx));
  };

  const drawWheel = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Define a set of colors that complement blue
    const colors = [
      "#1E3A8A", // Dark Blue
      "#3B82F6", // Blue
      "#60A5FA", // Light Blue
      "#93C5FD", // Very Light Blue
      "#FBBF24", // Amber
      "#F59E0B", // Orange
      "#F97316"  // Dark Orange
    ];

    // Ensure eligibleUsers is an array
    sectors = Array.isArray(eligibleUsers) ? eligibleUsers.map((user, index) => {
      // Select color while ensuring no adjacent colors are the same
      const color = colors[index % colors.length];

      return {
        color,
        text: "#FFFFFF", // Use white text for better contrast
        label: user.user.name,
        _id: user.user._id,
      };
    }) : [];

    // Draw the sectors
    sectors.forEach((sector, i) => drawSector(ctx, sector, i));
    rotate(ctx); // Initial rotation
  };

  useEffect(() => {
    drawWheel(); // Draw the wheel when the component mounts or eligibleUsers changes

    if (isSpinning) {
      // Notify parent that spinning has started
      onSpinStatusChange(true);

      angVel = rand(0.35, 0.55); // Random initial velocity
      spinButtonClickedRef.current = true;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      engine(ctx); // Start the spinning engine
    }
  }, [isSpinning, eligibleUsers]); // Re-run when isSpinning or eligibleUsers changes

  return (
    <div id="spin_the_wheel" style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        id="wheel"
        width="500"
        height="500"
        style={{
          margin: "20px auto",
          display: "block",
          position: "relative",
          border: "none",
        }}
      ></canvas>
      <div id="spin">SPIN</div>
    </div>
  );

};

export default WheelOfPrizes;
