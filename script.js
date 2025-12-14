// Function to approximate the two-tailed P-value from the T-statistic
function tDistributionTwoTailedPValue(t, df) {
    return "Cannot be computed accurately without dedicated library."; 
}

// Function to get the approximate critical T-value for a two-tailed test
function getCriticalT(df, alpha) {
    if (df < 1) return (alpha === 0.05) ? 100 : 1000; 

    const criticalValues = {
        20: { 0.10: 1.725, 0.05: 2.086, 0.01: 2.845 },
        30: { 0.10: 1.697, 0.05: 2.042, 0.01: 2.750 },
        60: { 0.10: 1.671, 0.05: 2.000, 0.01: 2.660 },
        // Z-score for infinite DF
        Infinity: { 0.10: 1.645, 0.05: 1.960, 0.01: 2.576 }
    };
    
    let closestDf;
    if (df >= 60) {
        closestDf = 60;
    } else if (df >= 30) {
        closestDf = 30;
    } else if (df >= 20) {
        closestDf = 20;
    } else {
        return criticalValues[20][alpha] || 2.5; 
    }

    if (criticalValues[closestDf] && criticalValues[closestDf][alpha]) {
        return criticalValues[closestDf][alpha];
    }
    return 1.96; 
}

// Function to get the standard Z-critical value (always based on infinite DF)
function getStandardZCritical(alpha) {
    // These are standard Z-scores for two-tailed tests at common alpha levels
    const zCriticalValues = {
        0.10: 1.645,
        0.05: 1.960,
        0.01: 2.576
    };
    return zCriticalValues[alpha] || 1.96; // Default to 1.96 if alpha is uncommon
}

// Function to calculate Welch-Satterthwaite Degrees of Freedom for unpooled test
function calculateWelchDF(std1, n1, std2, n2) {
    const v1 = Math.pow(std1, 2);
    const v2 = Math.pow(std2, 2);
    const a = v1 / n1;
    const b = v2 / n2;

    const numerator = Math.pow(a + b, 2);
    const denominatorTerm1 = Math.pow(a, 2) / (n1 - 1);
    const denominatorTerm2 = Math.pow(b, 2) / (n2 - 1);
    const denominator = denominatorTerm1 + denominatorTerm2;

    return Math.floor(numerator / denominator);
}

// Function to toggle visibility of Sample SD (s) vs. Population SD (sigma) inputs
function toggleTestInputs() {
    const testType = document.querySelector('input[name="testType"]:checked').value;
    const isTTest = testType.startsWith('t_');
    
    const tInputs = document.querySelectorAll('.t-test-only');
    const zInputs = document.querySelectorAll('.z-test-only');

    tInputs.forEach(el => el.classList.toggle('hidden', !isTTest));
    zInputs.forEach(el => el.classList.toggle('hidden', isTTest));
}


// The main function to run the Z/T-Test analysis
function runAnalysis() {
    toggleTestInputs(); // Ensure inputs are correctly displayed

    // 1. Get Input Values
    const mean1 = parseFloat(document.getElementById('mean1').value);
    const n1 = parseInt(document.getElementById('n1').value);
    
    const mean2 = parseFloat(document.getElementById('mean2').value);
    const n2 = parseInt(document.getElementById('n2').value);
    
    const alpha = parseFloat(document.getElementById('alpha-level').value); 
    const testType = document.querySelector('input[name="testType"]:checked').value; 

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<h2>// ANALYSIS OUTPUT</h2>`;
    
    // Get SD values based on the selected test type
    let std1, std2;
    if (testType === 'z_test') {
        std1 = parseFloat(document.getElementById('popStd1').value); // Population SD (sigma)
        std2 = parseFloat(document.getElementById('popStd2').value); // Population SD (sigma)
    } else {
        std1 = parseFloat(document.getElementById('std1').value);   // Sample SD (s)
        std2 = parseFloat(document.getElementById('std2').value);   // Sample SD (s)
    }

    // 2. Input Validation (basic)
    if (isNaN(mean1) || isNaN(std1) || isNaN(n1) || 
        isNaN(mean2) || isNaN(std2) || isNaN(n2) ||
        isNaN(alpha) || n1 < 2 || n2 < 2 || std1 < 0 || std2 < 0 || alpha <= 0) {
        resultsDiv.innerHTML += "<span style='color: red;'>ERROR: Input parameters invalid. Check all fields (N >= 2, Std Dev >= 0, Alpha > 0).</span>";
        return;
    }

    // --- Core Statistical Calculation ---
    let df;
    let statValue; // T-stat or Z-stat
    let criticalStat; // T-critical or Z-critical
    let standardError;
    let varianceCalcStep = '';
    let testTypeLabel = '';
    let formulaSE = '';
    let statName = '';

    if (testType.startsWith('t_')) { // T-TEST Logic
        statName = 't';
        
        if (testType === 't_pooled') {
            df = n1 + n2 - 2;
            const pooledVarianceNumerator = (n1 - 1) * Math.pow(std1, 2) + (n2 - 1) * Math.pow(std2, 2);
            const pooledVariance = pooledVarianceNumerator / df;
            const sp = Math.sqrt(pooledVariance);
            standardError = sp * Math.sqrt((1 / n1) + (1 / n2));

            testTypeLabel = 'T-Test (Pooled Variance)';
            formulaSE = `S_{p \\cdot E} = \\sqrt{\\frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1+n_2-2}} \\cdot \\sqrt{\\frac{1}{n_1} + \\frac{1}{n_2}}`;

            varianceCalcStep = `
                <p><strong>Pooled Variance (s<sub>p</sub><sup>2</sup>):</strong></p>
                <p class="math-output">$$s_p^2 = \\frac{(${n1}-1)\\cdot${std1.toFixed(2)}^2 + (${n2}-1)\\cdot${std2.toFixed(2)}^2}{${df.toFixed(0)}} = ${pooledVariance.toFixed(4)}$$</p>
            `;

        } else { // t_welch
            df = calculateWelchDF(std1, n1, std2, n2);
            const v1 = Math.pow(std1, 2);
            const v2 = Math.pow(std2, 2);
            standardError = Math.sqrt((v1 / n1) + (v2 / n2));
            
            testTypeLabel = "T-Test (Welch's/Unequal Variance)";
            formulaSE = `SE = \\sqrt{\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}}`;
            
            varianceCalcStep = `
                <p><strong>Welch's Degrees of Freedom (DF):</strong></p>
                <p class="math-output">$$\\text{DF} = \\lfloor \\frac{(\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2})^2}{\\frac{(s_1^2/n_1)^2}{n_1-1} + \\frac{(s_2^2/n_2)^2}{n_2-1}} \\rfloor = ${df}$$</p>
            `;
        }
        criticalStat = getCriticalT(df, alpha);

    } else { // Z-TEST Logic
        statName = 'z';
        df = 'N/A ($\infty$)';
        
        // Z-test uses population standard deviation (sigma)
        const v1 = Math.pow(std1, 2);
        const v2 = Math.pow(std2, 2);
        standardError = Math.sqrt((v1 / n1) + (v2 / n2));
        
        testTypeLabel = "Z-Test (Known Population SD)";
        formulaSE = `SE = \\sqrt{\\frac{\\sigma_1^2}{n_1} + \\frac{\\sigma_2^2}{n_2}}`;
        
        varianceCalcStep = `
            <p><strong>Population Standard Deviations ($\sigma$):</strong></p>
            <ul>
                <li>$\sigma_1$ = ${std1.toFixed(2)}</li>
                <li>$\sigma_2$ = ${std2.toFixed(2)}</li>
            </ul>
        `;
        criticalStat = getStandardZCritical(alpha);
    }

    statValue = (mean1 - mean2) / standardError;
    const rejectionCondition = `|${statName}| > ${criticalStat.toFixed(3)}`;
    const isSignificant = Math.abs(statValue) > criticalStat;
    const decision = isSignificant ? "REJECT" : "FAIL TO REJECT";
    const conclusionClass = isSignificant ? 'conclusion-reject' : 'conclusion-fail-reject';

    // --- Generate Formatted Output (Step-by-Step) ---

    let outputHTML = `
        <div class="step">
            <h3>Step 1: Given Data & Test Type</h3>
            <p><strong>Test Type:</strong> ${testTypeLabel}</p>
            <p>Sample 1 Mean: <span class="math-var">&bar;x<sub>1</sub></span> = ${mean1.toFixed(2)}</p>
            <p>Sample 2 Mean: <span class="math-var">&bar;x<sub>2</sub></span> = ${mean2.toFixed(2)}</p>
            ${varianceCalcStep}
            <p><strong>Degrees of Freedom (DF):</strong> ${df}</p>
        </div>

        <div class="step">
            <h3>Step 2: Calculate ${statName.toUpperCase()}-Statistic</h3>
            <p>The ${statName}-statistic is calculated as:</p>
            <p class="math-output">$$${statName} = \\frac{\\bar{x}_1 - \\bar{x}_2}{${formulaSE.includes('S_{p \\cdot E}') ? 'S_{p \\cdot E}' : 'SE'}}$$</p>
            <p>Standard Error (SE) = <span class="result-value">${standardError.toFixed(4)}</span></p>
            <p>${statName} = <span class="result-value">${statValue.toFixed(4)}</span></p>
        </div>
        
        <div class="step">
            <h3>Step 3: Find the Critical Value</h3>
            <p>For a <span class="highlight">**two-tailed**</span> test at &alpha; = ${alpha.toFixed(2)} with ${statName === 't' ? `DF = ${df}` : 'Z-Distribution'}:</p>
            <p><span class="math-var">${statName === 't' ? 't' : 'z'}<sub>critical</sub></span> = <span class="result-value">±${criticalStat.toFixed(3)}</span></p>
            <p>The P-value is estimated as: <span class="result-value">${tDistributionTwoTailedPValue(statValue, df)}</span> (Conclusion based on Critical ${statName.toUpperCase()})</p>
        </div>
        
        <div class="step">
            <h3>Step 4: Decision Rule</h3>
            <ul>
                <li>Reject H<sub>0</sub> if ${rejectionCondition}</li>
            </ul>
        </div>
        
        <div class="step">
            <h3>Step 5: Make the Decision</h3>
            <p>|${statValue.toFixed(4)}| <span class="operator">${isSignificant ? '>' : '<'}</span> ${criticalStat.toFixed(3)}</p>
            <div class="final-conclusion ${conclusionClass}">
                <p>&gt; ${decision} the null hypothesis (H<sub>0</sub>)</p>
            </div>
        </div>
    `;

    resultsDiv.innerHTML += outputHTML;

    // Trigger KaTeX rendering after new content is added
    setTimeout(() => {
        if (typeof renderMathInElement !== 'undefined') {
             renderMathInElement(resultsDiv, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "$", right: "$", display: false}
                ]
            });
        }
    }, 50);
}

// Run the Analysis on load and update on input change
document.addEventListener('DOMContentLoaded', function() {
    
    // Add event listeners to trigger runAnalysis whenever an input or radio changes
    const inputs = document.querySelectorAll('input[type="number"], input[name="testType"]');
    inputs.forEach(input => input.addEventListener('input', runAnalysis));
    
    // Ensure button click works (for redundancy)
    const button = document.querySelector('button');
    if (button) {
        button.onclick = runAnalysis;
    }

    // Run the Analysis on load with default values
    runAnalysis();
});