export default function PlanBadge({ planName, colorCode }) {
  // Use user-provided hex code or fallback to a default color
  const bgColor = colorCode || '#3b82f6';

  // A simple function to determine if text should be light or dark based on background hex
  const getContrastYIQ = (hexcolor) => {
    // Remove hash if present
    const hex = hexcolor.replace('#', '');

    // Parse r, g, b values
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate contrast
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    // Return black for light colors, white for dark colors
    return (yiq >= 128) ? '#000000' : '#ffffff';
  };

  const textColor = getContrastYIQ(bgColor);

  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {planName}
    </span>
  );
}
