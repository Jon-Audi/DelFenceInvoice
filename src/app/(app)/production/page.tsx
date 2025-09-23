
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProductionTask, ProductionTaskName } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ALL_TASKS: ProductionTaskName[] = [
  'Building wood sections',
  'Building vinyl sections',
  'Wiring up chain link gates',
  'Welding chain link gates',
  'Cutting pickets'
];

const formatElapsedTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function ProductionPage() {
  const [tasks, setTasks] = useState<Map<ProductionTaskName, ProductionTask>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const intervalsRef = useRef<Map<ProductionTaskName, NodeJS.Timeout>>(new Map());
  const [taskToReset, setTaskToReset] = useState<ProductionTask | null>(null);


  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'productionTasks'), (snapshot) => {
      const fetchedTasks = new Map<ProductionTaskName, ProductionTask>();
      // Ensure all predefined tasks have an entry
      ALL_TASKS.forEach(taskName => {
        const doc = snapshot.docs.find(d => d.id === taskName);
        if (doc) {
          fetchedTasks.set(taskName, { id: doc.id, ...doc.data() } as ProductionTask);
        } else {
          // Create a default task structure if not in Firestore
          fetchedTasks.set(taskName, {
            id: taskName,
            name: taskName,
            status: 'Not Started',
            elapsedSeconds: 0,
          });
        }
      });
      setTasks(fetchedTasks);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching production tasks:", error);
      toast({ title: "Error", description: "Could not fetch production tasks.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      intervalsRef.current.forEach(intervalId => clearInterval(intervalId));
    };
  }, [toast]);

  useEffect(() => {
    tasks.forEach((task, taskName) => {
      if (task.status === 'In Progress' && !intervalsRef.current.has(taskName)) {
        const intervalId = setInterval(() => {
          setTasks(prevTasks => {
            const newTasks = new Map(prevTasks);
            const currentTask = newTasks.get(taskName);
            if (currentTask && currentTask.status === 'In Progress') {
              const updatedTask = { ...currentTask, elapsedSeconds: currentTask.elapsedSeconds + 1 };
              newTasks.set(taskName, updatedTask);
              return newTasks;
            }
            return prevTasks;
          });
        }, 1000);
        intervalsRef.current.set(taskName, intervalId);
      } else if (task.status !== 'In Progress' && intervalsRef.current.has(taskName)) {
        clearInterval(intervalsRef.current.get(taskName)!);
        intervalsRef.current.delete(taskName);
      }
    });

    return () => {
      intervalsRef.current.forEach(intervalId => clearInterval(intervalId));
    };
  }, [tasks]);

  const handleTaskUpdate = async (task: ProductionTask) => {
    try {
      const taskRef = doc(db, 'productionTasks', task.id);
      await setDoc(taskRef, task, { merge: true });
    } catch (error) {
      console.error(`Error saving task ${task.name}:`, error);
      toast({ title: "Save Error", description: `Could not save task: ${task.name}.`, variant: "destructive" });
    }
  };

  const handleFieldChange = (taskName: ProductionTaskName, field: 'cost' | 'materialAmount' | 'notes', value: string | number) => {
    setTasks(prevTasks => {
      const newTasks = new Map(prevTasks);
      const task = newTasks.get(taskName);
      if (task) {
        newTasks.set(taskName, { ...task, [field]: value });
      }
      return newTasks;
    });
  };
  
  const handleToggleTimer = (task: ProductionTask) => {
    let updatedTask: ProductionTask;
    if (task.status === 'In Progress') {
      updatedTask = { ...task, status: 'Paused' };
      // Stop interval (handled by useEffect)
    } else { // 'Not Started' or 'Paused'
      updatedTask = { ...task, status: 'In Progress', startTime: task.startTime || new Date().toISOString() };
      // Start interval (handled by useEffect)
    }
    setTasks(prev => new Map(prev).set(task.name, updatedTask));
    handleTaskUpdate(updatedTask); // Save status change immediately
  };
  
  const handleStopAndSave = (task: ProductionTask) => {
    if (task.status === 'In Progress') {
      intervalsRef.current.delete(task.name); // Clean up interval reference
    }
    const updatedTask = { ...task, status: 'Completed' };
    setTasks(prev => new Map(prev).set(task.name, updatedTask));
    handleTaskUpdate(updatedTask);
    toast({ title: 'Task Completed', description: `Task "${task.name}" has been marked as complete and saved.` });
  };
  
  const handleResetTask = async () => {
    if (!taskToReset) return;
    const taskName = taskToReset.name;
    const freshTask: ProductionTask = {
      id: taskName,
      name: taskName,
      status: 'Not Started',
      elapsedSeconds: 0,
      cost: undefined,
      materialAmount: undefined,
      notes: undefined,
      startTime: undefined,
    };
    if (intervalsRef.current.has(taskName)) {
      clearInterval(intervalsRef.current.get(taskName)!);
      intervalsRef.current.delete(taskName);
    }
    setTasks(prev => new Map(prev).set(taskName, freshTask));
    await handleTaskUpdate(freshTask);
    toast({ title: "Task Reset", description: `Task "${taskName}" has been reset.` });
    setTaskToReset(null);
  };


  if (isLoading) {
    return (
      <PageHeader title="Production Tracking" description="Loading production tasks...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }
  
  const sortedTasks = Array.from(tasks.values()).sort((a,b) => ALL_TASKS.indexOf(a.name) - ALL_TASKS.indexOf(b.name));

  return (
    <>
      <PageHeader title="Production Tracking" description="Time and track costs for standard fabrication tasks." />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedTasks.map((task) => (
          <Card key={task.id} className={cn("flex flex-col", task.status === 'In Progress' && 'border-primary ring-2 ring-primary ring-offset-2')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="Timer" />
                {task.name}
              </CardTitle>
              <CardDescription>
                Status: <span className={cn("font-semibold", 
                  task.status === 'In Progress' && 'text-primary',
                  task.status === 'Completed' && 'text-green-600',
                  task.status === 'Paused' && 'text-amber-600'
                )}>{task.status}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div className="text-center bg-muted rounded-lg p-4">
                <div className="text-5xl font-mono tracking-tighter">
                  {formatElapsedTime(task.elapsedSeconds)}
                </div>
                <Label className="text-xs text-muted-foreground">HH:MM:SS</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor={`cost-${task.id}`}>Cost ($)</Label>
                  <Input 
                    id={`cost-${task.id}`} 
                    type="number" 
                    placeholder="0.00" 
                    value={task.cost ?? ''}
                    onChange={(e) => handleFieldChange(task.name, 'cost', parseFloat(e.target.value) || undefined)}
                    onBlur={() => handleTaskUpdate(tasks.get(task.name)!)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`material-${task.id}`}>Material Amt.</Label>
                  <Input 
                    id={`material-${task.id}`} 
                    placeholder="e.g., 10 sections" 
                    value={task.materialAmount ?? ''}
                    onChange={(e) => handleFieldChange(task.name, 'materialAmount', e.target.value)}
                    onBlur={() => handleTaskUpdate(tasks.get(task.name)!)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor={`notes-${task.id}`}>Notes</Label>
                <Textarea 
                    id={`notes-${task.id}`} 
                    placeholder="Add any relevant notes..."
                    value={task.notes ?? ''}
                    onChange={(e) => handleFieldChange(task.name, 'notes', e.target.value)}
                    onBlur={() => handleTaskUpdate(tasks.get(task.name)!)}
                    rows={2}
                />
              </div>
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handleToggleTimer(task)} disabled={task.status === 'Completed'}>
                {task.status === 'In Progress' ? <Icon name="Pause" className="mr-2" /> : <Icon name="Play" className="mr-2" />}
                {task.status === 'In Progress' ? 'Pause' : 'Start'}
              </Button>
              <Button onClick={() => handleStopAndSave(task)} disabled={task.status === 'Not Started' || task.status === 'Completed'}>
                <Icon name="Check" className="mr-2" />
                Stop & Save
              </Button>
               <Button variant="destructive" className="col-span-2" onClick={() => setTaskToReset(task)} disabled={task.status === 'Not Started' && task.elapsedSeconds === 0}>
                <Icon name="Trash2" className="mr-2"/> Reset Task
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
       {taskToReset && (
        <AlertDialog open={!!taskToReset} onOpenChange={(isOpen) => !isOpen && setTaskToReset(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently reset all data for the task 
                "{taskToReset.name}", including elapsed time, cost, materials, and notes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTaskToReset(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Reset Task
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
