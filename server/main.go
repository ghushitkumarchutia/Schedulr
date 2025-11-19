package main

import (
	"log"
	"net/http"
	"sort"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Process struct {
	ID            string `json:"id"`
	ArrivalTime   int    `json:"arrivalTime"`
	BurstTime     int    `json:"burstTime"`
	RemainingTime int    `json:"-"`
	Priority      int    `json:"priority,omitempty"`

	StartTime      int  `json:"-"`
	IsStarted      bool `json:"-"`
	CompletionTime int  `json:"completionTime"`
	TurnaroundTime int  `json:"turnaroundTime"`
	WaitingTime    int  `json:"waitingTime"`
	ResponseTime   int  `json:"responseTime"`
}

type TimelineSegment struct {
	ProcessID string `json:"processId"`
	StartTime int    `json:"startTime"`
	EndTime   int    `json:"endTime"`
}

type SimulationRequest struct {
	Algorithm    string    `json:"algorithm"`
	IsPreemptive bool      `json:"isPreemptive"`
	TimeQuantum  int       `json:"timeQuantum,omitempty"`
	Processes    []Process `json:"processes"`
}

type SimulationResponse struct {
	Processes             []Process         `json:"processes"`
	Timeline              []TimelineSegment `json:"timeline"`
	AverageWaitingTime    float64           `json:"averageWaitingTime"`
	AverageTurnaroundTime float64           `json:"averageTurnaroundTime"`
	AverageResponseTime   float64           `json:"averageResponseTime"`
}

func main() {
	r := gin.Default()

	// Configure CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"POST", "GET", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.POST("/simulate", handleSimulation)

	log.Println("Server running on port 8080")
	r.Run(":8080")
}

func handleSimulation(c *gin.Context) {
	var req SimulationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate the request
	if len(req.Processes) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No processes provided"})
		return
	}

	// Initialize remaining time for all processes
	for i := range req.Processes {
		req.Processes[i].RemainingTime = req.Processes[i].BurstTime
	}

	var response SimulationResponse

	// Run appropriate scheduling algorithm
	switch req.Algorithm {
	case "FCFS":
		response = runFCFS(req.Processes)
	case "SJF":
		if req.IsPreemptive {
			response = runSRTF(req.Processes) // Preemptive SJF is SRTF
		} else {
			response = runSJF(req.Processes) // Non-preemptive SJF
		}
	case "RR":
		response = runRoundRobin(req.Processes, req.TimeQuantum)
	case "Priority":
		if req.IsPreemptive {
			response = runPreemptivePriority(req.Processes)
		} else {
			response = runNonPreemptivePriority(req.Processes)
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown algorithm"})
		return
	}

	// Calculate average times
	var totalWaitingTime, totalTurnaroundTime, totalResponseTime int
	for _, p := range response.Processes {
		totalWaitingTime += p.WaitingTime
		totalTurnaroundTime += p.TurnaroundTime
		totalResponseTime += p.ResponseTime
	}

	numProcesses := float64(len(response.Processes))
	response.AverageWaitingTime = float64(totalWaitingTime) / numProcesses
	response.AverageTurnaroundTime = float64(totalTurnaroundTime) / numProcesses
	response.AverageResponseTime = float64(totalResponseTime) / numProcesses

	c.JSON(http.StatusOK, response)
}

// First Come First Served (FCFS) scheduling algorithm
func runFCFS(processes []Process) SimulationResponse {
	// Make a copy of processes to avoid modifying the original
	procs := make([]Process, len(processes))
	copy(procs, processes)

	// Sort processes by arrival time
	sort.Slice(procs, func(i, j int) bool {
		return procs[i].ArrivalTime < procs[j].ArrivalTime
	})

	var timeline []TimelineSegment
	currentTime := 0

	// Process each job in order of arrival
	for i := range procs {
		// If the process hasn't arrived yet, advance the clock
		if currentTime < procs[i].ArrivalTime {
			currentTime = procs[i].ArrivalTime
		}

		// Set start time and response time (first time CPU gets the process)
		procs[i].StartTime = currentTime
		procs[i].ResponseTime = procs[i].StartTime - procs[i].ArrivalTime

		// Add to timeline
		segment := TimelineSegment{
			ProcessID: procs[i].ID,
			StartTime: currentTime,
			EndTime:   currentTime + procs[i].BurstTime,
		}
		timeline = append(timeline, segment)

		// Update current time
		currentTime += procs[i].BurstTime

		// Calculate completion time, turnaround time, and waiting time
		procs[i].CompletionTime = currentTime
		procs[i].TurnaroundTime = procs[i].CompletionTime - procs[i].ArrivalTime
		procs[i].WaitingTime = procs[i].TurnaroundTime - procs[i].BurstTime
	}

	return SimulationResponse{
		Processes: procs,
		Timeline:  timeline,
	}
}

// Shortest Job First (SJF) - Non-preemptive
func runSJF(processes []Process) SimulationResponse {
	// Make a copy of processes
	procs := make([]Process, len(processes))
	copy(procs, processes)

	var timeline []TimelineSegment
	var completed []Process
	currentTime := 0
	remainingProcesses := len(procs)

	// Find process with earliest arrival time to set initial currentTime
	earliestArrival := procs[0].ArrivalTime
	for _, p := range procs {
		if p.ArrivalTime < earliestArrival {
			earliestArrival = p.ArrivalTime
		}
	}
	currentTime = earliestArrival

	for remainingProcesses > 0 {
		// Find the process with shortest burst time among arrived processes
		minBurstTime := -1
		selectedIdx := -1

		for i, p := range procs {
			if p.RemainingTime > 0 && p.ArrivalTime <= currentTime {
				if minBurstTime == -1 || p.BurstTime < minBurstTime {
					minBurstTime = p.BurstTime
					selectedIdx = i
				}
			}
		}

		// If no process is available at current time, advance time to next arrival
		if selectedIdx == -1 {
			nextArrival := -1
			for _, p := range procs {
				if p.RemainingTime > 0 {
					if nextArrival == -1 || p.ArrivalTime < nextArrival {
						nextArrival = p.ArrivalTime
					}
				}
			}
			currentTime = nextArrival
			continue
		}

		// Set start time for the selected process if it hasn't started yet
		if !procs[selectedIdx].IsStarted {
			procs[selectedIdx].StartTime = currentTime
			procs[selectedIdx].ResponseTime = procs[selectedIdx].StartTime - procs[selectedIdx].ArrivalTime
			procs[selectedIdx].IsStarted = true
		}

		// Add to timeline
		segment := TimelineSegment{
			ProcessID: procs[selectedIdx].ID,
			StartTime: currentTime,
			EndTime:   currentTime + procs[selectedIdx].RemainingTime,
		}
		timeline = append(timeline, segment)

		// Update current time
		currentTime += procs[selectedIdx].RemainingTime

		// Set completion time, turnaround time, and waiting time
		procs[selectedIdx].CompletionTime = currentTime
		procs[selectedIdx].TurnaroundTime = procs[selectedIdx].CompletionTime - procs[selectedIdx].ArrivalTime
		procs[selectedIdx].WaitingTime = procs[selectedIdx].TurnaroundTime - procs[selectedIdx].BurstTime

		// Mark process as completed
		procs[selectedIdx].RemainingTime = 0
		completed = append(completed, procs[selectedIdx])
		remainingProcesses--
	}

	return SimulationResponse{
		Processes: completed,
		Timeline:  timeline,
	}
}

// Shortest Remaining Time First (SRTF) - Preemptive SJF
func runSRTF(processes []Process) SimulationResponse {
	// Make a copy of processes
	procs := make([]Process, len(processes))
	copy(procs, processes)

	var timeline []TimelineSegment
	currentTime := 0
	remainingProcesses := len(procs)

	// Initialize tracking variables
	for i := range procs {
		procs[i].IsStarted = false
	}

	// Find process with earliest arrival time
	earliestArrival := procs[0].ArrivalTime
	for _, p := range procs {
		if p.ArrivalTime < earliestArrival {
			earliestArrival = p.ArrivalTime
		}
	}
	currentTime = earliestArrival

	// Track the currently running process
	var currentProcess int = -1
	var currentSegmentStart int = 0

	// Continue until all processes complete
	for remainingProcesses > 0 {
		// Find process with shortest remaining time among arrived processes
		minRemainingTime := -1
		selectedIdx := -1

		for i, p := range procs {
			if p.RemainingTime > 0 && p.ArrivalTime <= currentTime {
				if minRemainingTime == -1 || p.RemainingTime < minRemainingTime {
					minRemainingTime = p.RemainingTime
					selectedIdx = i
				}
			}
		}

		// If no process is available, advance time to next arrival
		if selectedIdx == -1 {
			nextArrival := -1
			for _, p := range procs {
				if p.RemainingTime > 0 {
					if nextArrival == -1 || p.ArrivalTime < nextArrival {
						nextArrival = p.ArrivalTime
					}
				}
			}

			// If we had a process running before, add its segment to timeline
			if currentProcess != -1 {
				timeline = append(timeline, TimelineSegment{
					ProcessID: procs[currentProcess].ID,
					StartTime: currentSegmentStart,
					EndTime:   currentTime,
				})
				currentProcess = -1
			}

			currentTime = nextArrival
			continue
		}

		// If this is the first time this process gets CPU, record response time
		if !procs[selectedIdx].IsStarted {
			procs[selectedIdx].StartTime = currentTime
			procs[selectedIdx].ResponseTime = currentTime - procs[selectedIdx].ArrivalTime
			procs[selectedIdx].IsStarted = true
		}

		// If there's a process switch, record the previous process's segment
		if currentProcess != selectedIdx && currentProcess != -1 {
			timeline = append(timeline, TimelineSegment{
				ProcessID: procs[currentProcess].ID,
				StartTime: currentSegmentStart,
				EndTime:   currentTime,
			})
			currentSegmentStart = currentTime
		} else if currentProcess == -1 {
			currentSegmentStart = currentTime
		}

		currentProcess = selectedIdx

		// Determine how long this process will run
		// Either until completion or until next process arrival that could preempt it
		timeSlice := procs[selectedIdx].RemainingTime

		// Find next arrival time that might preempt this process
		for _, p := range procs {
			if p.RemainingTime > 0 && p.ArrivalTime > currentTime && p.ArrivalTime < currentTime+timeSlice {
				// Only consider arrivals that could preempt (have shorter remaining time)
				if p.BurstTime < procs[selectedIdx].RemainingTime-(p.ArrivalTime-currentTime) {
					timeSlice = p.ArrivalTime - currentTime
				}
			}
		}

		// Update current time and process's remaining time
		currentTime += timeSlice
		procs[selectedIdx].RemainingTime -= timeSlice

		// If process completes
		if procs[selectedIdx].RemainingTime == 0 {
			// Add final segment to timeline
			timeline = append(timeline, TimelineSegment{
				ProcessID: procs[selectedIdx].ID,
				StartTime: currentSegmentStart,
				EndTime:   currentTime,
			})

			// Set completion time and calculate metrics
			procs[selectedIdx].CompletionTime = currentTime
			procs[selectedIdx].TurnaroundTime = procs[selectedIdx].CompletionTime - procs[selectedIdx].ArrivalTime
			procs[selectedIdx].WaitingTime = procs[selectedIdx].TurnaroundTime - procs[selectedIdx].BurstTime

			remainingProcesses--
			currentProcess = -1
		}
	}

	return SimulationResponse{
		Processes: procs,
		Timeline:  timeline,
	}
}

// Round Robin scheduling algorithm
func runRoundRobin(processes []Process, timeQuantum int) SimulationResponse {
	if timeQuantum <= 0 {
		timeQuantum = 1 // Default time quantum
	}

	// Make a copy of processes
	procs := make([]Process, len(processes))
	copy(procs, processes)

	var timeline []TimelineSegment
	var readyQueue []int // Queue of process indices
	currentTime := 0

	// Initialize tracking variables
	for i := range procs {
		procs[i].IsStarted = false
	}

	// Find earliest arrival
	earliestArrival := procs[0].ArrivalTime
	for _, p := range procs {
		if p.ArrivalTime < earliestArrival {
			earliestArrival = p.ArrivalTime
		}
	}
	currentTime = earliestArrival

	// Add initially available processes to ready queue
	for i, p := range procs {
		if p.ArrivalTime <= currentTime {
			readyQueue = append(readyQueue, i)
		}
	}

	// Continue until all processes complete
	completedCount := 0
	for completedCount < len(procs) {
		if len(readyQueue) == 0 {
			// Find next arriving process if ready queue is empty
			nextArrival := -1
			nextIndex := -1
			for i, p := range procs {
				if p.RemainingTime > 0 && p.ArrivalTime > currentTime {
					if nextArrival == -1 || p.ArrivalTime < nextArrival {
						nextArrival = p.ArrivalTime
						nextIndex = i
					}
				}
			}
			if nextIndex == -1 {
				break // No more processes to execute
			}
			currentTime = nextArrival
			readyQueue = append(readyQueue, nextIndex)
		}

		// Get next process from ready queue
		currentProcessIdx := readyQueue[0]
		readyQueue = readyQueue[1:] // Dequeue

		// Record response time if process hasn't started
		if !procs[currentProcessIdx].IsStarted {
			procs[currentProcessIdx].StartTime = currentTime
			procs[currentProcessIdx].ResponseTime = currentTime - procs[currentProcessIdx].ArrivalTime
			procs[currentProcessIdx].IsStarted = true
		}

		// Calculate execution time for this quantum
		executeTime := timeQuantum
		if procs[currentProcessIdx].RemainingTime < executeTime {
			executeTime = procs[currentProcessIdx].RemainingTime
		}

		// Add to timeline
		timeline = append(timeline, TimelineSegment{
			ProcessID: procs[currentProcessIdx].ID,
			StartTime: currentTime,
			EndTime:   currentTime + executeTime,
		})

		// Update time and remaining time
		currentTime += executeTime
		procs[currentProcessIdx].RemainingTime -= executeTime

		// Check for new arrivals during this time quantum
		for i, p := range procs {
			if p.RemainingTime > 0 && p.ArrivalTime > currentTime-executeTime && p.ArrivalTime <= currentTime && !contains(readyQueue, i) {
				readyQueue = append(readyQueue, i)
			}
		}

		// If process still has remaining time, add back to ready queue
		if procs[currentProcessIdx].RemainingTime > 0 {
			readyQueue = append(readyQueue, currentProcessIdx)
		} else {
			// Process completed
			procs[currentProcessIdx].CompletionTime = currentTime
			procs[currentProcessIdx].TurnaroundTime = procs[currentProcessIdx].CompletionTime - procs[currentProcessIdx].ArrivalTime
			procs[currentProcessIdx].WaitingTime = procs[currentProcessIdx].TurnaroundTime - procs[currentProcessIdx].BurstTime
			completedCount++
		}
	}

	return SimulationResponse{
		Processes: procs,
		Timeline:  timeline,
	}
}

// Non-Preemptive Priority Scheduling
func runNonPreemptivePriority(processes []Process) SimulationResponse {
	// Make a copy of processes
	procs := make([]Process, len(processes))
	copy(procs, processes)

	var timeline []TimelineSegment
	currentTime := 0
	remainingProcesses := len(procs)

	// Find earliest arrival
	earliestArrival := procs[0].ArrivalTime
	for _, p := range procs {
		if p.ArrivalTime < earliestArrival {
			earliestArrival = p.ArrivalTime
		}
	}
	currentTime = earliestArrival

	for remainingProcesses > 0 {
		// Find process with highest priority (lowest number) among arrived processes
		highestPriority := -1
		selectedIdx := -1

		for i, p := range procs {
			if p.RemainingTime > 0 && p.ArrivalTime <= currentTime {
				if highestPriority == -1 || p.Priority < highestPriority {
					highestPriority = p.Priority
					selectedIdx = i
				}
			}
		}

		// If no process is available, advance time to next arrival
		if selectedIdx == -1 {
			nextArrival := -1
			for _, p := range procs {
				if p.RemainingTime > 0 {
					if nextArrival == -1 || p.ArrivalTime < nextArrival {
						nextArrival = p.ArrivalTime
					}
				}
			}
			currentTime = nextArrival
			continue
		}

		// Record start time and response time if not started
		if !procs[selectedIdx].IsStarted {
			procs[selectedIdx].StartTime = currentTime
			procs[selectedIdx].ResponseTime = currentTime - procs[selectedIdx].ArrivalTime
			procs[selectedIdx].IsStarted = true
		}

		// Add to timeline
		segment := TimelineSegment{
			ProcessID: procs[selectedIdx].ID,
			StartTime: currentTime,
			EndTime:   currentTime + procs[selectedIdx].RemainingTime,
		}
		timeline = append(timeline, segment)

		// Update time
		currentTime += procs[selectedIdx].RemainingTime

		// Set completion time and metrics
		procs[selectedIdx].CompletionTime = currentTime
		procs[selectedIdx].TurnaroundTime = procs[selectedIdx].CompletionTime - procs[selectedIdx].ArrivalTime
		procs[selectedIdx].WaitingTime = procs[selectedIdx].TurnaroundTime - procs[selectedIdx].BurstTime

		// Mark process as completed
		procs[selectedIdx].RemainingTime = 0
		remainingProcesses--
	}

	return SimulationResponse{
		Processes: procs,
		Timeline:  timeline,
	}
}

// Preemptive Priority Scheduling
func runPreemptivePriority(processes []Process) SimulationResponse {
	// Make a copy of processes
	procs := make([]Process, len(processes))
	copy(procs, processes)

	var timeline []TimelineSegment
	currentTime := 0
	remainingProcesses := len(procs)

	// Initialize tracking variables
	for i := range procs {
		procs[i].IsStarted = false
	}

	// Find earliest arrival
	earliestArrival := procs[0].ArrivalTime
	for _, p := range procs {
		if p.ArrivalTime < earliestArrival {
			earliestArrival = p.ArrivalTime
		}
	}
	currentTime = earliestArrival

	// Track the currently running process
	var currentProcess int = -1
	var currentSegmentStart int = 0

	for remainingProcesses > 0 {
		// Find process with highest priority (lowest number) among arrived processes
		highestPriority := -1
		selectedIdx := -1

		for i, p := range procs {
			if p.RemainingTime > 0 && p.ArrivalTime <= currentTime {
				if highestPriority == -1 || p.Priority < highestPriority {
					highestPriority = p.Priority
					selectedIdx = i
				}
			}
		}

		// If no process is available, advance time to next arrival
		if selectedIdx == -1 {
			nextArrival := -1
			for _, p := range procs {
				if p.RemainingTime > 0 {
					if nextArrival == -1 || p.ArrivalTime < nextArrival {
						nextArrival = p.ArrivalTime
					}
				}
			}

			// If we had a process running before, add its segment to timeline
			if currentProcess != -1 {
				timeline = append(timeline, TimelineSegment{
					ProcessID: procs[currentProcess].ID,
					StartTime: currentSegmentStart,
					EndTime:   currentTime,
				})
				currentProcess = -1
			}

			currentTime = nextArrival
			continue
		}

		// If this is the first time this process gets CPU, record response time
		if !procs[selectedIdx].IsStarted {
			procs[selectedIdx].StartTime = currentTime
			procs[selectedIdx].ResponseTime = currentTime - procs[selectedIdx].ArrivalTime
			procs[selectedIdx].IsStarted = true
		}

		// If there's a process switch, record the previous process's segment
		if currentProcess != selectedIdx && currentProcess != -1 {
			timeline = append(timeline, TimelineSegment{
				ProcessID: procs[currentProcess].ID,
				StartTime: currentSegmentStart,
				EndTime:   currentTime,
			})
			currentSegmentStart = currentTime
		} else if currentProcess == -1 {
			currentSegmentStart = currentTime
		}

		currentProcess = selectedIdx

		// Determine how long this process will run
		timeSlice := procs[selectedIdx].RemainingTime

		// Find next arrival time that might preempt this process
		for _, p := range procs {
			if p.RemainingTime > 0 && p.ArrivalTime > currentTime && p.ArrivalTime < currentTime+timeSlice {
				// Only consider arrivals that could preempt (have higher priority)
				if p.Priority < procs[selectedIdx].Priority {
					timeSlice = p.ArrivalTime - currentTime
				}
			}
		}

		// Update current time and process's remaining time
		currentTime += timeSlice
		procs[selectedIdx].RemainingTime -= timeSlice

		// If process completes
		if procs[selectedIdx].RemainingTime == 0 {
			// Add final segment to timeline
			timeline = append(timeline, TimelineSegment{
				ProcessID: procs[selectedIdx].ID,
				StartTime: currentSegmentStart,
				EndTime:   currentTime,
			})

			// Set completion time and calculate metrics
			procs[selectedIdx].CompletionTime = currentTime
			procs[selectedIdx].TurnaroundTime = procs[selectedIdx].CompletionTime - procs[selectedIdx].ArrivalTime
			procs[selectedIdx].WaitingTime = procs[selectedIdx].TurnaroundTime - procs[selectedIdx].BurstTime

			remainingProcesses--
			currentProcess = -1
		}
	}

	return SimulationResponse{
		Processes: procs,
		Timeline:  timeline,
	}
}

// Helper function to check if a slice contains a value
func contains(slice []int, val int) bool {
	for _, item := range slice {
		if item == val {
			return true
		}
	}
	return false
}
