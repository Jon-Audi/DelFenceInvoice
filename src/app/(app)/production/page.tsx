
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProductionTask, ProductionTaskName, ProductionHistoryItem } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, addDoc } from 'firebase/firestore';
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

// This is a new, separate component to manage its own timer state
const ProductionTaskCard: React.FC<{
  task: ProductionTask;
  onFieldChange: (taskName: ProductionTaskName, field: 'cost' | 'materialAmount' | 'notes' | 'poNumber', value: string | number | undefined) => void;
  onToggleTimer: (task: ProductionTask) => void;
  onStopAndSave: (task: ProductionTask) => void;
  onSave: (task: ProductionTask) => void;
}> = ({ task, onFieldChange, onToggleTimer, onStopAndSave, onSave }) => {
  const [displaySeconds, setDisplaySeconds] = useState(task.elapsedSeconds);

  useEffect(() => {
    setDisplaySeconds(task.elapsedSeconds);

    if (task.status === 'In Progress' && task.startTime) {
      const start = new Date(task.startTime).getTime();
      
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsedSinceStart = (now - start) / 1000;
        setDisplaySeconds(task.elapsedSeconds + elapsedSinceStart);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [task]);
  
  const formatElapsedTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <Card className={cn("flex flex-col", task.status === 'In Progress' && 'border-primary ring-2 ring-primary ring-offset-2')}>
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
            {formatElapsedTime(displaySeconds)}
          </div>
          <Label className="text-xs text-muted-foreground">HH:MM:SS</Label>
        </div>

        <div className="space-y-1">
            <Label htmlFor={`poNumber-${task.id}`}>PO # / Job Name</Label>
            <Input 
              id={`poNumber-${task.id}`} 
              placeholder="e.g., 12345 or Smith Job" 
              value={task.poNumber ?? ''}
              onChange={(e) => onFieldChange(task.name, 'poNumber', e.target.value)}
              onBlur={() => onSave(task)}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor={`cost-${task.id}`}>Labor Cost ($)</Label>
            <Input 
              id={`cost-${task.id}`} 
              type="number" 
              placeholder="0.00" 
              value={task.cost ?? ''}
              onChange={(e) => onFieldChange(task.name, 'cost', parseFloat(e.target.value) || undefined)}
              onBlur={() => onSave(task)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`material-${task.id}`}>Material Amt.</Label>
            <Input 
              id={`material-${task.id}`} 
              placeholder="e.g., 10 sections" 
              value={task.materialAmount ?? ''}
              onChange={(e) => onFieldChange(task.name, 'materialAmount', e.target.value)}
              onBlur={() => onSave(task)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`notes-${task.id}`}>Notes</Label>
          <Textarea 
              id={`notes-${task.id}`} 
              placeholder="Add any relevant notes..."
              value={task.notes ?? ''}
              onChange={(e) => onFieldChange(task.name, 'notes', e.target.value)}
              onBlur={() => onSave(task)}
              rows={2}
          />
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => onToggleTimer(task)} disabled={task.status === 'Completed'}>
          {task.status === 'In Progress' ? <Icon name="Pause" className="mr-2" /> : <Icon name="Play" className="mr-2" />}
          {task.status === 'In Progress' ? 'Pause' : 'Start'}
        </Button>
        <Button onClick={() => onStopAndSave(task)} disabled={task.status === 'Not Started'}>
          <Icon name="Check" className="mr-2" />
          Stop & Save
        </Button>
      </CardFooter>
    </Card>
  );
};


export default function ProductionPage() {
  const [tasks, setTasks] = useState<Map<ProductionTaskName, ProductionTask>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'productionTasks'), (snapshot) => {
      const fetchedTasks = new Map<ProductionTaskName, ProductionTask>();
      ALL_TASKS.forEach(taskName => {
        const doc = snapshot.docs.find(d => d.id === taskName);
        if (doc) {
          fetchedTasks.set(taskName, { id: doc.id, ...doc.data() } as ProductionTask);
        } else {
          fetchedTasks.set(taskName, {
            id: taskName, name: taskName, status: 'Not Started', elapsedSeconds: 0,
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

    return () => unsubscribe();
  }, [toast]);


  const handleTaskUpdate = async (task: ProductionTask) => {
    try {
      const taskRef = doc(db, 'productionTasks', task.id);
      
      const dataToSave: Partial<ProductionTask> = { ...task };
      // Firestore does not allow `undefined` values. Clean them up before saving.
      Object.keys(dataToSave).forEach(keyStr => {
        const key = keyStr as keyof ProductionTask;
        if (dataToSave[key] === undefined) {
          delete dataToSave[key];
        }
      });
      
      await setDoc(taskRef, dataToSave, { merge: true });
    } catch (error) {
      console.error(`Error saving task ${task.name}:`, error);
      toast({ title: "Save Error", description: `Could not save task: ${task.name}.`, variant: "destructive" });
    }
  };

  const handleFieldChange = (taskName: ProductionTaskName, field: 'cost' | 'materialAmount' | 'notes' | 'poNumber', value: string | number | undefined) => {
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
      const now = new Date();
      const start = task.startTime ? new Date(task.startTime) : now;
      const secondsSinceStart = (now.getTime() - start.getTime()) / 1000;
      
      updatedTask = { 
        ...task, 
        status: 'Paused',
        elapsedSeconds: task.elapsedSeconds + secondsSinceStart,
        startTime: undefined, 
      };

    } else {
      updatedTask = { 
        ...task, 
        status: 'In Progress', 
        startTime: new Date().toISOString(),
      };
    }
    setTasks(prev => new Map(prev).set(task.name, updatedTask));
    handleTaskUpdate(updatedTask);
  };
  
  const handleStopAndSave = async (task: ProductionTask) => {
     let finalTaskState = { ...task };
     let finalElapsedSeconds = task.elapsedSeconds;

    if (task.status === 'In Progress' && task.startTime) {
      const now = new Date();
      const start = new Date(task.startTime);
      const secondsSinceStart = (now.getTime() - start.getTime()) / 1000;
      finalElapsedSeconds += secondsSinceStart;
    }

    if (finalElapsedSeconds === 0) {
      toast({ title: 'No Time Recorded', description: 'Cannot save a task with zero elapsed time.', variant: 'default' });
      return;
    }

    const historyItem: Omit<ProductionHistoryItem, 'id'> = {
      taskName: finalTaskState.name,
      completedAt: new Date().toISOString(),
      elapsedSeconds: finalElapsedSeconds,
      cost: finalTaskState.cost ?? null,
      materialAmount: finalTaskState.materialAmount ?? null,
      notes: finalTaskState.notes ?? null,
      poNumber: finalTaskState.poNumber ?? null,
    };

    try {
      await addDoc(collection(db, 'productionHistory'), historyItem);
      
      // 2. Reset the main task card
      const freshTask: ProductionTask = {
        id: task.name,
        name: task.name,
        status: 'Not Started',
        elapsedSeconds: 0,
        cost: undefined,
        materialAmount: undefined,
        notes: undefined,
        startTime: undefined,
        poNumber: undefined,
      };
      setTasks(prev => new Map(prev).set(task.name, freshTask));
      await handleTaskUpdate(freshTask);

      toast({ title: 'Task Saved', description: `Task "${task.name}" has been saved to history and reset.` });

    } catch(error) {
      console.error("Error saving task history:", error);
      toast({ title: "Save Error", description: "Could not save task to history.", variant: "destructive" });
    }
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
          <ProductionTaskCard
            key={task.id}
            task={task}
            onFieldChange={handleFieldChange}
            onToggleTimer={handleToggleTimer}
            onStopAndSave={handleStopAndSave}
            onSave={handleTaskUpdate}
          />
        ))}
      </div>
    </>
  );
}

