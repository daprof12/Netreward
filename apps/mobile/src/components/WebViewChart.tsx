import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useThemeColors } from '@/theme';

interface ChartSeries {
  key: string;
  color: string;
  name?: string;
}

interface WebViewChartProps {
  data: any[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  type?: 'area' | 'bar';
}

export default function WebViewChart({ 
  data, 
  xKey, 
  series,
  height = 180,
  type = 'area'
}: WebViewChartProps) {
  const colors = useThemeColors();
  const [isLoading, setIsLoading] = useState(true);

  // Self-contained SVG chart — zero CDN dependencies
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:transparent;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
#chart{width:100%;height:${height}px;position:relative}
svg{width:100%;height:100%}
.tick-label{fill:${colors.textSecondary};font-size:10px}
.grid-line{stroke:${colors.glassBorder};stroke-width:0.5;stroke-dasharray:3,3}
.tooltip{
  position:absolute;display:none;
  background:${colors.bgPrimary};border:1px solid ${colors.glassBorder};
  border-radius:8px;padding:8px 12px;font-size:11px;color:${colors.textPrimary};
  box-shadow:0 4px 12px rgba(0,0,0,0.15);pointer-events:none;z-index:10;
  white-space:nowrap;
}
.tooltip-label{color:${colors.textSecondary};font-weight:700;margin-bottom:4px}
.tooltip-row{margin-top:2px;font-weight:700}
.cursor-line{stroke:${colors.glassBorder};stroke-width:1;stroke-dasharray:4,4;display:none}
.area-path{fill-opacity:0.2;stroke-width:0}
.line-path{fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.bar-rect{rx:4;ry:4}
.active-dot{display:none;stroke-width:2;fill:${colors.bgPrimary}}
</style>
</head>
<body>
<div id="chart">
  <svg id="svg"></svg>
  <div class="tooltip" id="tooltip"></div>
</div>
<script>
(function(){
  var data = ${JSON.stringify(data)};
  var xKey = '${xKey}';
  var series = ${JSON.stringify(series)};
  var chartType = '${type}';
  var chartH = ${height};

  if (!data || data.length === 0) {
    document.getElementById('chart').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:${height}px;color:${colors.textSecondary};font-size:12px">No data</div>';
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('chart_rendered');
    return;
  }

  var pad = { top: 12, right: 12, bottom: 28, left: 42 };
  var svg = document.getElementById('svg');
  var tooltip = document.getElementById('tooltip');
  var chartDiv = document.getElementById('chart');

  function getSize() {
    var r = chartDiv.getBoundingClientRect();
    return { w: r.width, h: chartH };
  }

  function render() {
    var size = getSize();
    var W = size.w, H = size.h;
    var plotW = W - pad.left - pad.right;
    var plotH = H - pad.top - pad.bottom;

    // Compute Y range across all series
    var allVals = [];
    series.forEach(function(s) {
      data.forEach(function(d) {
        var v = Number(d[s.key]) || 0;
        allVals.push(v);
      });
    });
    var yMin = 0;
    var yMax = Math.max.apply(null, allVals);
    if (yMax === 0) yMax = 1;
    // Add 10% headroom
    yMax = yMax * 1.1;

    // Nice tick values
    function niceNum(range, round) {
      var exp = Math.floor(Math.log10(range));
      var frac = range / Math.pow(10, exp);
      var nice;
      if (round) {
        if (frac < 1.5) nice = 1;
        else if (frac < 3) nice = 2;
        else if (frac < 7) nice = 5;
        else nice = 10;
      } else {
        if (frac <= 1) nice = 1;
        else if (frac <= 2) nice = 2;
        else if (frac <= 5) nice = 5;
        else nice = 10;
      }
      return nice * Math.pow(10, exp);
    }

    var tickCount = 5;
    var rawStep = (yMax - yMin) / (tickCount - 1);
    var step = rawStep > 0 ? niceNum(rawStep, true) : 1;
    var niceYMax = Math.ceil(yMax / step) * step;
    if (niceYMax === 0) niceYMax = step;
    var yTicks = [];
    for (var t = 0; t <= niceYMax; t += step) yTicks.push(t);

    function yScale(v) { return pad.top + plotH - (v / niceYMax) * plotH; }
    function xScale(i) { return pad.left + (i / (data.length - 1 || 1)) * plotW; }
    function xBarCenter(i) { return pad.left + (i + 0.5) / data.length * plotW; }
    var barW = Math.max(4, plotW / data.length * 0.6);

    var svgContent = '';
    // Defs for area gradients
    svgContent += '<defs>';
    series.forEach(function(s, si) {
      svgContent += '<linearGradient id="grad' + si + '" x1="0" y1="0" x2="0" y2="1">';
      svgContent += '<stop offset="0%" stop-color="' + s.color + '" stop-opacity="0.35"/>';
      svgContent += '<stop offset="100%" stop-color="' + s.color + '" stop-opacity="0.02"/>';
      svgContent += '</linearGradient>';
    });
    svgContent += '</defs>';

    // Grid lines
    yTicks.forEach(function(tv) {
      var y = yScale(tv);
      svgContent += '<line class="grid-line" x1="' + pad.left + '" y1="' + y + '" x2="' + (W - pad.right) + '" y2="' + y + '"/>';
    });

    // Y axis labels
    yTicks.forEach(function(tv) {
      var y = yScale(tv);
      var label = tv >= 1000 ? (tv/1000).toFixed(0) + 'k' : tv >= 1 ? tv.toFixed(1) : tv >= 0.01 ? tv.toFixed(2) : tv.toFixed(4);
      if (tv === 0) label = '0';
      svgContent += '<text class="tick-label" x="' + (pad.left - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + label + '</text>';
    });

    // X axis labels (show ~6 evenly spaced)
    var xLabelCount = Math.min(data.length, 6);
    var xLabelStep = Math.max(1, Math.floor((data.length - 1) / (xLabelCount - 1)));
    for (var xi = 0; xi < data.length; xi += xLabelStep) {
      var xPos = chartType === 'bar' ? xBarCenter(xi) : xScale(xi);
      svgContent += '<text class="tick-label" x="' + xPos + '" y="' + (H - 6) + '" text-anchor="middle">' + (data[xi][xKey] || '') + '</text>';
    }
    // Always show last label
    if ((data.length - 1) % xLabelStep !== 0 && data.length > 1) {
      var lastX = chartType === 'bar' ? xBarCenter(data.length - 1) : xScale(data.length - 1);
      svgContent += '<text class="tick-label" x="' + lastX + '" y="' + (H - 6) + '" text-anchor="middle">' + (data[data.length-1][xKey] || '') + '</text>';
    }

    if (chartType === 'area') {
      // Draw area fills and lines
      series.forEach(function(s, si) {
        var pathD = '';
        var areaD = '';
        data.forEach(function(d, di) {
          var x = xScale(di);
          var y = yScale(Number(d[s.key]) || 0);
          if (di === 0) {
            pathD += 'M' + x + ',' + y;
            areaD += 'M' + x + ',' + y;
          } else {
            // Smooth curve using cardinal spline approximation
            var px = xScale(di - 1);
            var py = yScale(Number(data[di-1][s.key]) || 0);
            var cx = (px + x) / 2;
            pathD += ' C' + cx + ',' + py + ' ' + cx + ',' + y + ' ' + x + ',' + y;
            areaD += ' C' + cx + ',' + py + ' ' + cx + ',' + y + ' ' + x + ',' + y;
          }
        });
        // Close area
        var lastX = xScale(data.length - 1);
        var firstX = xScale(0);
        var baseY = yScale(0);
        areaD += ' L' + lastX + ',' + baseY + ' L' + firstX + ',' + baseY + ' Z';
        svgContent += '<path class="area-path" d="' + areaD + '" fill="url(#grad' + si + ')"/>';
        svgContent += '<path class="line-path" d="' + pathD + '" stroke="' + s.color + '"/>';
      });
      // Active dots (hidden, shown on hover)
      series.forEach(function(s, si) {
        svgContent += '<circle class="active-dot" id="dot' + si + '" r="4" stroke="' + s.color + '"/>';
      });
    } else {
      // Bar chart
      var groupW = plotW / data.length;
      var singleBarW = Math.max(4, (groupW * 0.7) / series.length);
      data.forEach(function(d, di) {
        series.forEach(function(s, si) {
          var v = Number(d[s.key]) || 0;
          var barH = (v / niceYMax) * plotH;
          var x = pad.left + di * groupW + (groupW - singleBarW * series.length) / 2 + si * singleBarW;
          var y = yScale(v);
          svgContent += '<rect class="bar-rect" x="' + x + '" y="' + y + '" width="' + singleBarW + '" height="' + barH + '" fill="' + s.color + '" opacity="0.85"/>';
        });
      });
    }

    // Cursor line (hidden, shown on hover)
    svgContent += '<line class="cursor-line" id="cursorLine" x1="0" y1="' + pad.top + '" x2="0" y2="' + (H - pad.bottom) + '"/>';

    // Invisible hit areas for touch
    svgContent += '<rect id="hitArea" x="' + pad.left + '" y="' + pad.top + '" width="' + plotW + '" height="' + plotH + '" fill="transparent"/>';

    svg.innerHTML = svgContent;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    // Touch / hover interaction
    var hitArea = document.getElementById('hitArea');
    var cursorLine = document.getElementById('cursorLine');

    function showTooltip(clientX) {
      var rect = svg.getBoundingClientRect();
      var svgX = (clientX - rect.left) / rect.width * W;
      var idx;
      if (chartType === 'bar') {
        idx = Math.floor((svgX - pad.left) / (plotW / data.length));
      } else {
        idx = Math.round((svgX - pad.left) / plotW * (data.length - 1));
      }
      idx = Math.max(0, Math.min(data.length - 1, idx));

      var d = data[idx];
      var html = '<div class="tooltip-label">' + (d[xKey] || '') + '</div>';
      series.forEach(function(s) {
        var v = Number(d[s.key]) || 0;
        var formatted = v >= 1 ? v.toFixed(4) : v >= 0.001 ? v.toFixed(6) : v.toFixed(8);
        html += '<div class="tooltip-row" style="color:' + s.color + '">' + (s.name || s.key) + ': ' + formatted + '</div>';
      });
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';

      var xPos = chartType === 'bar' ? xBarCenter(idx) : xScale(idx);
      // Position tooltip
      var tooltipRect = tooltip.getBoundingClientRect();
      var left = (xPos / W) * rect.width - tooltipRect.width / 2;
      if (left < 4) left = 4;
      if (left + tooltipRect.width > rect.width - 4) left = rect.width - tooltipRect.width - 4;
      tooltip.style.left = left + 'px';
      tooltip.style.top = '4px';

      // Show cursor line
      cursorLine.setAttribute('x1', xPos);
      cursorLine.setAttribute('x2', xPos);
      cursorLine.style.display = 'block';

      // Show active dots for area chart
      if (chartType === 'area') {
        series.forEach(function(s, si) {
          var dot = document.getElementById('dot' + si);
          if (dot) {
            var v = Number(d[s.key]) || 0;
            dot.setAttribute('cx', xScale(idx));
            dot.setAttribute('cy', yScale(v));
            dot.style.display = 'block';
          }
        });
      }
    }

    function hideTooltip() {
      tooltip.style.display = 'none';
      cursorLine.style.display = 'none';
      series.forEach(function(s, si) {
        var dot = document.getElementById('dot' + si);
        if (dot) dot.style.display = 'none';
      });
    }

    hitArea.addEventListener('touchstart', function(e) {
      e.preventDefault();
      showTooltip(e.touches[0].clientX);
    }, { passive: false });
    hitArea.addEventListener('touchmove', function(e) {
      e.preventDefault();
      showTooltip(e.touches[0].clientX);
    }, { passive: false });
    hitArea.addEventListener('touchend', function() {
      setTimeout(hideTooltip, 1500);
    });
    hitArea.addEventListener('mousemove', function(e) { showTooltip(e.clientX); });
    hitArea.addEventListener('mouseleave', hideTooltip);
  }

  render();
  window.addEventListener('resize', render);

  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('chart_rendered');
})();
</script>
</body>
</html>`;

  return (
    <View style={[{ height, width: '100%', overflow: 'hidden', borderRadius: 12 }]}>
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 12, zIndex: 1 }]}>
          <ActivityIndicator size="small" color={colors.accentPrimary} />
        </View>
      )}
      <WebView
        source={{ html: htmlContent }}
        style={{ flex: 1, backgroundColor: 'transparent', opacity: isLoading ? 0 : 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        originWhitelist={['*']}
        onMessage={(event) => {
          if (event.nativeEvent.data === 'chart_rendered') {
            setIsLoading(false);
          }
        }}
        onLoadEnd={() => {
          // Fallback: hide loader after timeout
          setTimeout(() => setIsLoading(false), 2000);
        }}
        onError={() => setIsLoading(false)}
      />
    </View>
  );
}
