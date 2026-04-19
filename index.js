// Initialize date input with today's date
document.getElementById('date').valueAsDate = new Date();

// Load expenses from localStorage
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

// Chart instances
let pieChart = null;
let lineChart = null;

// Show alert
function showAlert(message, type) {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert alert-${type}`;
    alert.style.display = 'block';
    setTimeout(() => {
        alert.style.display = 'none';
    }, 3000);
}

// Add expense
document.getElementById('expenseForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const notes = document.getElementById('notes').value;

    if (!description || !amount || !category || !date) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    const expense = {
        id: Date.now(),
        description,
        amount,
        category,
        date,
        notes
    };

    expenses.unshift(expense);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    showAlert('Expense added successfully!', 'success');

    this.reset();
    document.getElementById('date').valueAsDate = new Date();
    updateUI();
});

// Delete expense
function deleteExpense(id) {
    expenses = expenses.filter(e => e.id !== id);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    showAlert('Expense deleted', 'success');
    updateUI();
}

// Get expense priority
function getExpensePriority(amount) {
    const avgAmount = expenses.length ? expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length : 0;
    if (amount > avgAmount * 1.5) return 'high';
    if (amount > avgAmount * 0.5) return 'medium';
    return 'low';
}

// Render expenses
function renderExpenses(data = expenses) {
    const list = document.getElementById('expensesList');

    if (data.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No expenses found. 🔍</p></div>';
        return;
    }

    list.innerHTML = data.map(expense => `
                <div class="expense-item ${getExpensePriority(expense.amount)}">
                    <div class="expense-info">
                        <div class="expense-description">${expense.description}</div>
                        <div class="expense-details">
                            ${expense.category} • ${new Date(expense.date).toLocaleDateString()}
                            ${expense.notes ? `• ${expense.notes}` : ''}
                        </div>
                    </div>
                    <div class="expense-amount">$<span>${expense.amount.toFixed(2)}</span></div>
                    <div class="expense-actions">
                        <button class="btn-delete" onclick="deleteExpense(${expense.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        // Update statistics
        function updateStats() {
            const total = expenses.reduce((sum, e) => sum + e.amount, 0);
            const now = new Date();
            const monthExpenses = expenses.filter(e => {
                const expenseDate = new Date(e.date);
                return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
            });
            const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
            const average = expenses.length ? (total / expenses.length) : 0;

            document.getElementById('totalAmount').textContent = `$ ${total.toFixed(2)}`;
            document.getElementById('monthAmount').textContent = `$ ${monthTotal.toFixed(2)}`;
            document.getElementById('averageAmount').textContent = `$ ${average.toFixed(2)}`;
        }

        // Update category chart
        function updateCategoryChart() {
            const categoryTotals = {};
            expenses.forEach(e => {
                categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
            });

            const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
            const chartDiv = document.getElementById('categoryChart');
            
            if (total === 0) {
                chartDiv.innerHTML = '<h3 style="margin-bottom: 15px; color: #667eea;">Expenses by Category</h3><p style="color: #999;">No data to display</p>';
                return;
            }

            const categories = Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => {
                    const percentage = (amount / total * 100).toFixed(1);
                    return `
                        <div class="chart-bar">
                            <div class="chart-label">
                                <span>${category}</span>
                                <span>$ ${amount.toFixed(2)} (${percentage}%)</span>
                            </div>
                            <div class="chart-bar-fill" style="width: ${percentage}%"></div>
                        </div>
                    `;
                }).join('');

            chartDiv.innerHTML = `<h3 style="margin-bottom: 15px; color: #667eea;">Expenses by Category</h3>${categories}`;

            // Update Chart.js charts
            updatePieChart(categoryTotals);
            updateLineChart();
        }

        // Update pie chart
        function updatePieChart(categoryTotals) {
            const ctx = document.getElementById('pieChart').getContext('2d');
            
            if (pieChart) {
                pieChart.destroy();
            }

            const labels = Object.keys(categoryTotals);
            const data = Object.values(categoryTotals);
            
            const colors = [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                '#4BC0C0', '#FF6384'
            ];

            pieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors.slice(0, labels.length),
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: $${context.parsed.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Update line chart for monthly trends
        function updateLineChart() {
            const ctx = document.getElementById('lineChart').getContext('2d');
            
            if (lineChart) {
                lineChart.destroy();
            }

            // Group expenses by month
            const monthlyData = {};
            expenses.forEach(expense => {
                const date = new Date(expense.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + expense.amount;
            });

            // Sort months
            const sortedMonths = Object.keys(monthlyData).sort();
            const labels = sortedMonths.map(month => {
                const [year, monthNum] = month.split('-');
                return new Date(year, monthNum - 1).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short' 
                });
            });
            const data = sortedMonths.map(month => monthlyData[month]);

            lineChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Monthly Expenses',
                        data: data,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#667eea',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `$${context.parsed.y.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toFixed(0);
                                }
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45
                            }
                        }
                    }
                }
            });
        }

        // Apply filters
        function applyFilters() {
            const search = document.getElementById('searchInput').value.toLowerCase();
            const category = document.getElementById('categoryFilter').value;
            const dateFrom = document.getElementById('dateFrom').value;
            const dateTo = document.getElementById('dateTo').value;
            const monthYear = document.getElementById('monthYear').value;

            const filtered = expenses.filter(e => {
                // Search filter
                const matchesSearch = e.description.toLowerCase().includes(search) || e.notes.toLowerCase().includes(search);
                
                // Category filter
                const matchesCategory = !category || e.category === category;
                
                // Date range filter
                let matchesDateRange = true;
                if (dateFrom || dateTo) {
                    const expenseDate = new Date(e.date);
                    if (dateFrom && expenseDate < new Date(dateFrom)) {
                        matchesDateRange = false;
                    }
                    if (dateTo && expenseDate > new Date(dateTo)) {
                        matchesDateRange = false;
                    }
                }
                
                // Month/Year filter
                let matchesMonthYear = true;
                if (monthYear) {
                    const [year, month] = monthYear.split('-');
                    const expenseDate = new Date(e.date);
                    if (expenseDate.getFullYear() !== parseInt(year) || 
                        (expenseDate.getMonth() + 1) !== parseInt(month)) {
                        matchesMonthYear = false;
                    }
                }
                
                return matchesSearch && matchesCategory && matchesDateRange && matchesMonthYear;
            });

            renderExpenses(filtered);
        }

        // Reset filters
        function resetFilters() {
            document.getElementById('searchInput').value = '';
            document.getElementById('categoryFilter').value = '';
            document.getElementById('dateFrom').value = '';
            document.getElementById('dateTo').value = '';
            document.getElementById('monthYear').value = '';
            renderExpenses(expenses);
            showAlert('Filters reset!', 'success');
        }

        // Clear all expenses
        function clearAllExpenses() {
            if (confirm('Are you sure you want to delete all expenses? This cannot be undone.')) {
                expenses = [];
                localStorage.setItem('expenses', JSON.stringify(expenses));
                showAlert('All expenses cleared', 'success');
                updateUI();
            }
        }

        // Download report
        function downloadExpenses() {
            let csv = 'Description,Amount,Category,Date,Notes\n';
            expenses.forEach(e => {
                csv += `"${e.description}",${e.amount},"${e.category}","${e.date}","${e.notes}"\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            showAlert('Report downloaded successfully!', 'success');
        }

        // Update all UI elements
        function updateUI() {
            renderExpenses();
            updateStats();
            updateCategoryChart();
        }

        // Initial load
        updateUI();

        // Add event listeners to filters
        document.getElementById('searchInput').addEventListener('keyup', applyFilters);
        document.getElementById('categoryFilter').addEventListener('change', applyFilters);

        // Help Tooltips
        const helpContent = {
            description: {
                title: '📝 Description',
                text: 'Enter a brief description of your expense. Be specific so you can easily remember what you spent money on. Examples: "Grocery shopping at Walmart", "Coffee at Starbucks", "Gas station fill-up"'
            },
            amount: {
                title: '💵 Amount',
                text: 'Enter the total cost of your expense in your local currency. Use decimals for cents (e.g., 25.99). Do not include currency symbols - just the numbers.'
            },
            category: {
                title: '🏷️ Category',
                text: 'Select the type of expense from the dropdown list. Categories help you track spending patterns. Choose the category that best matches your expense for accurate tracking.'
            },
            date: {
                title: '📅 Date',
                text: 'Select the date when you made this expense. By default, today\'s date is selected. You can choose any past date to add expenses retroactively.'
            },
            notes: {
                title: '📌 Notes',
                text: 'Optional field. Add any additional details about your expense that might be helpful later. Examples: "Meeting with client", "Birthday gift for sister", "Monthly subscription"'
            },
            summary: {
                title: '📊 Summary Dashboard',
                text: 'View your expense statistics at a glance:\n• Total Expenses: Sum of all your recorded expenses\n• This Month: Total spent in the current month\n• Average: Average expense amount per transaction\n• Category Chart: Visual breakdown of spending by category'
            },
            recent: {
                title: '📋 Recent Expenses',
                text: 'All your recorded expenses appear here. You can:\n• Search by description or notes\n• Filter by category\n• View expense details\n• Delete individual expenses\n• Color-coded by priority (red=high, orange=medium, green=low)'
            }
        };

        // Add event listeners to help buttons
        document.querySelectorAll('.help-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                showHelpTooltip(this.dataset.help);
            });
        });

        // Show help tooltip
        function showHelpTooltip(helpKey) {
            if (!helpContent[helpKey]) return;

            const help = helpContent[helpKey];
            const tooltip = document.getElementById('tooltip');
            const tooltipContent = document.getElementById('tooltipContent');

            tooltipContent.innerHTML = `<strong>${help.title}</strong><p>${help.text}</p>`;
            tooltip.classList.remove('hide');
            tooltip.classList.add('show');

            // Create overlay
            if (!document.querySelector('.tooltip-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'tooltip-overlay';
                overlay.onclick = closeTooltip;
                document.body.appendChild(overlay);
            }
        }

        // Close help tooltip
        function closeTooltip() {
            const tooltip = document.getElementById('tooltip');
            tooltip.classList.remove('show');
            tooltip.classList.add('hide');
            
            const overlay = document.querySelector('.tooltip-overlay');
            if (overlay) {
                overlay.classList.add('hide');
                setTimeout(() => {
                    overlay.remove();
                }, 300);
            }
        }

        // Close tooltip on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeTooltip();
            }
        });

        // Add event listeners to date filters
        document.getElementById('dateFrom').addEventListener('change', applyFilters);
        document.getElementById('dateTo').addEventListener('change', applyFilters);
        document.getElementById('monthYear').addEventListener('change', applyFilters);

        // Animate section reveals using IntersectionObserver
        const animatedItems = document.querySelectorAll('.animate-item');
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.2 });
            animatedItems.forEach(item => observer.observe(item));
        } else {
            animatedItems.forEach(item => item.classList.add('active'));
        }

        // Modal functions
        function showLoginModal() {
            document.getElementById('loginModal').classList.add('show');
        }

        function showSignupModal() {
            document.getElementById('signupModal').classList.add('show');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('show');
        }

        // Auth form handlers
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            // Simple mock authentication (replace with real auth)
            if (email && password) {
                showAlert('Login successful! Welcome back.', 'success');
                closeModal('loginModal');
                this.reset();
            } else {
                showAlert('Please fill in all fields', 'error');
            }
        });

        document.getElementById('signupForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;
            
            if (password !== confirmPassword) {
                showAlert('Passwords do not match', 'error');
                return;
            }
            
            if (name && email && password) {
                showAlert('Account created successfully! Welcome!', 'success');
                closeModal('signupModal');
                this.reset();
            } else {
                showAlert('Please fill in all fields', 'error');
            }
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('show');
                }
            });
        });

        // Welcome overlay behavior
        const welcomeOverlay = document.getElementById('welcomeOverlay');
        const enterAppBtn = document.getElementById('enterAppBtn');

        function closeWelcomeOverlay() {
            if (welcomeOverlay) {
                welcomeOverlay.style.opacity = '0';
                welcomeOverlay.style.pointerEvents = 'none';
                setTimeout(() => {
                    welcomeOverlay.style.display = 'none';
                }, 300);
            }
        }

        if (enterAppBtn) {
            enterAppBtn.addEventListener('click', closeWelcomeOverlay);
        }

        window.addEventListener('load', () => {
            if (welcomeOverlay) {
                welcomeOverlay.style.opacity = '1';
            }
        });