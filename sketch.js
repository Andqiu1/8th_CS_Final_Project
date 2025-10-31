let allData = [];
let filteredData = [];
let table;
let margin = { top: 100, right: 60, bottom: 80, left: 80 };
let plotWidth, plotHeight;
let minX, maxX, minY, maxY;
let hoveredPoint = null;
let mouseInPlot = false;
let locationDropdown;
let searchInput;
let allLocations = [];
let selectedLocation = 'All Locations';

function preload() {
  // Load your CSV file here
  // Replace 'data.csv' with your actual file path
  table = loadTable('Sea_Levels_NOAA.csv', 'csv', 'header');
}

function setup() {
  createCanvas(1200, 700);
  plotWidth = width - margin.left - margin.right;
  plotHeight = height - margin.top - margin.bottom;
  
  // Parse the CSV data
  for (let i = 0; i < table.getRowCount(); i++) {
    let row = table.getRow(i);
    allData.push({
      id: row.getNum('ObjectId'),
      measure: row.getString('Measure'),
      date: row.getString('Date'),
      change: row.getNum('Change in Mean (mm)')
    });
  }
  
  // Get unique locations from the list
  let locationSet = new Set([
    'Adriatic Sea', 'Andaman Sea', 'Arabian Sea', 'Atlantic Ocean', 'Baltic Sea',
    'Bay Bengal', 'Bering Sea', 'Caribbean Sea', 'Gulf Mexico', 'Indian Ocean',
    'Indonesian', 'Mediterranean', 'Nino', 'North Atlantic', 'North Pacific',
    'North Sea', 'Pacific Ocean', 'Persian Gulf', 'Sea Japan', 'Sea Okhotsk',
    'South China', 'Southern Ocean', 'Tropics', 'World', 'Yellow Sea'
  ]);
  
  allLocations = ['All Locations', ...Array.from(locationSet).sort()];
  
  // Create search input
  searchInput = createInput('');
  searchInput.position(20, 20);
  searchInput.size(200);
  searchInput.attribute('placeholder', 'Search location...');
  searchInput.input(filterLocations);
  
  // Create dropdown
  locationDropdown = createSelect();
  locationDropdown.position(230, 20);
  locationDropdown.size(250);
  
  // Populate dropdown
  updateDropdownOptions(allLocations);
  
  locationDropdown.changed(updateLocation);
  
  // Initialize with all data
  filteredData = allData;
  calculateBounds();
}

function filterLocations() {
  let searchTerm = searchInput.value().toLowerCase();
  let filtered = allLocations.filter(loc => 
    loc.toLowerCase().includes(searchTerm)
  );
  updateDropdownOptions(filtered);
}

function updateDropdownOptions(locations) {
  // Clear existing options
  locationDropdown.html('');
  
  // Add filtered options
  for (let loc of locations) {
    locationDropdown.option(loc);
  }
  
  // Set selected value if it exists in filtered list
  if (locations.includes(selectedLocation)) {
    locationDropdown.value(selectedLocation);
  }
}

function updateLocation() {
  selectedLocation = locationDropdown.value();
  
  if (selectedLocation === 'All Locations') {
    filteredData = allData;
  } else {
    filteredData = allData.filter(d => d.measure === selectedLocation);
  }
  
  calculateBounds();
}

function calculateBounds() {
  if (filteredData.length === 0) return;
  
  minX = 0;
  maxX = filteredData.length - 1;
  minY = min(filteredData.map(d => d.change));
  maxY = max(filteredData.map(d => d.change));
  
  // Add some padding to Y axis
  let yPadding = (maxY - minY) * 0.1;
  minY -= yPadding;
  maxY += yPadding;
}

function draw() {
  background(255);
  
  if (allData.length === 0) {
    fill(100);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('Please load a CSV file with the correct format', width / 2, height / 2);
    return;
  }
  
  if (filteredData.length === 0) {
    fill(100);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('No data available for selected location', width / 2, height / 2);
    return;
  }
  
  // Draw plot area
  push();
  translate(margin.left, margin.top);
  
  // Draw axes
  drawAxes();
  
  // Check if mouse is in plot area
  let mx = mouseX - margin.left;
  let my = mouseY - margin.top;
  mouseInPlot = mx >= 0 && mx <= plotWidth && my >= 0 && my <= plotHeight;
  
  // Draw vertical dotted line and find nearest point
  if (mouseInPlot) {
    let xIndex = Math.round(map(mx, 0, plotWidth, minX, maxX));
    xIndex = constrain(xIndex, 0, filteredData.length - 1);
    
    hoveredPoint = filteredData[xIndex];
    
    // Draw dotted vertical line
    let lineX = map(xIndex, minX, maxX, 0, plotWidth);
    stroke(100, 100, 255, 150);
    strokeWeight(1);
    drawingContext.setLineDash([5, 5]);
    line(lineX, 0, lineX, plotHeight);
    drawingContext.setLineDash([]);
  } else {
    hoveredPoint = null;
  }
  
  // Draw data points
  for (let i = 0; i < filteredData.length; i++) {
    let x = map(i, minX, maxX, 0, plotWidth);
    let y = map(filteredData[i].change, minY, maxY, plotHeight, 0);
    
    // Highlight hovered point
    if (hoveredPoint && filteredData[i].id === hoveredPoint.id) {
      fill(255, 100, 100);
      noStroke();
      circle(x, y, 8);
    } else {
      fill(70, 130, 180, 180);
      noStroke();
      circle(x, y, 4);
    }
  }
  
  
  // Draw trendline
  drawTrendline();
  
  pop();
  
  // Draw hover box
  if (hoveredPoint) {
    drawHoverBox();
  }
  
  // Draw title
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(18);
  let titleText = selectedLocation === 'All Locations' 
    ? 'Sea Level Change Over Time - All Locations'
    : 'Sea Level Change Over Time - ' + selectedLocation;
  text(titleText, width / 2, margin.top / 2 + 10);
  
  // Draw data count
  textSize(12);
  fill(100);
  text(filteredData.length + ' data points', width / 2, margin.top / 2 + 35);
}

function drawAxes() {
  stroke(0);
  strokeWeight(2);
  noFill();
  
  // X and Y axes
  line(0, plotHeight, plotWidth, plotHeight);
  line(0, 0, 0, plotHeight);
  
  // Y-axis labels and ticks
  fill(0);
  noStroke();
  textAlign(RIGHT, CENTER);
  textSize(11);
  
  // Find the range and determine appropriate tick spacing
  let yRange = maxY - minY;
  let yMin = Math.floor(minY / 10) * 10;
  let yMax = Math.ceil(maxY / 10) * 10;
  
  // Draw zero line if it's in range
  if (minY <= 0 && maxY >= 0) {
    let zeroY = map(0, minY, maxY, plotHeight, 0);
    stroke(0);
    strokeWeight(2);
    line(0, zeroY, plotWidth, zeroY);
  }
  
  // Draw major ticks every 50, minor ticks every 10
  for (let val = yMin; val <= yMax; val += 10) {
    let y = map(val, minY, maxY, plotHeight, 0);
    
    if (y >= 0 && y <= plotHeight) {
      // Determine if this is a major tick (every 50)
      let isMajorTick = (val % 50 === 0);
      
      // Draw tick mark
      stroke(0);
      strokeWeight(1);
      if (isMajorTick) {
        line(-8, y, 0, y);
      } else {
        line(-5, y, 0, y);
      }
      
      // Draw grid line
      stroke(isMajorTick ? 150 : 220);
      strokeWeight(isMajorTick ? 0.8 : 0.3);
      line(0, y, plotWidth, y);
      
      // Draw label for major ticks
      if (isMajorTick) {
        fill(0);
        noStroke();
        text(val.toFixed(0), -12, y);
      }
    }
  }
  
  // Axis labels
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(14);
  
  push();
  translate(-50, plotHeight / 2);
  rotate(-HALF_PI);
  text('Change in Mean (mm)', 0, 0);
  pop();
  
  text('Data Point Index', plotWidth / 2, plotHeight + 50);
}

function drawHoverBox() {
  let boxWidth = 200;
  let boxHeight = 90;
  let boxX = mouseX + 15;
  let boxY = mouseY - 10;
  
  // Keep box within canvas bounds
  if (boxX + boxWidth > width - 10) {
    boxX = mouseX - boxWidth - 15;
  }
  if (boxY + boxHeight > height - 10) {
    boxY = height - boxHeight - 10;
  }
  if (boxY < 10) {
    boxY = 10;
  }
  
  // Draw box
  fill(255, 255, 255, 250);
  stroke(100);
  strokeWeight(1);
  rect(boxX, boxY, boxWidth, boxHeight, 5);
  
  // Draw text
  fill(0);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(12);
  
  let textX = boxX + 10;
  let textY = boxY + 10;
  let lineHeight = 18;
  
  text('ID: ' + hoveredPoint.id, textX, textY);
  text('Location: ' + hoveredPoint.measure, textX, textY + lineHeight);
  text('Date: ' + hoveredPoint.date, textX, textY + lineHeight * 2);
  text('Change: ' + hoveredPoint.change.toFixed(2) + ' mm', textX, textY + lineHeight * 3);
}

function drawTrendline() {
  if (filteredData.length < 2) return;
  
  // Calculate linear regression (least squares)
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  let n = filteredData.length;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += filteredData[i].change;
    sumXY += i * filteredData[i].change;
    sumXX += i * i;
  }
  
  // Calculate slope (m) and intercept (b) for y = mx + b
  let slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  let intercept = (sumY - slope * sumX) / n;
  
  // Draw the trendline
  let x1 = 0;
  let y1Value = intercept;
  let y1 = map(y1Value, minY, maxY, plotHeight, 0);
  
  let x2 = plotWidth;
  let y2Value = slope * (n - 1) + intercept;
  let y2 = map(y2Value, minY, maxY, plotHeight, 0);
  
  stroke(255, 100, 100, 200);
  strokeWeight(2);
  line(x1, y1, x2, y2);
  
  // Reset stroke
  noStroke();
}
