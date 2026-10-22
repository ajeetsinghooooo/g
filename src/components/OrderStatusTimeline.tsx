import React from 'react';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  PackageCheck,
  Bike,
  Store,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { OrderStatus, OrderType } from '../types';

interface OrderStatusTimelineProps {
  status: OrderStatus;
  orderType: OrderType;
  createdAt?: string;
  updatedAt?: string;
}

export const OrderStatusTimeline: React.FC<OrderStatusTimelineProps> = ({
  status,
  orderType,
  createdAt,
  updatedAt,
}) => {
  const deliverySteps: Array<{ key: OrderStatus; title: string; desc: string; icon: any }> = [
    {
      key: 'Order Received',
      title: 'Order Received',
      desc: 'We have received your order request.',
      icon: Clock,
    },
    {
      key: 'Confirmed',
      title: 'Order Confirmed',
      desc: 'Kitchen Cruze has accepted and queued your order.',
      icon: CheckCircle2,
    },
    {
      key: 'Preparing',
      title: 'Preparing Food',
      desc: 'Our master chefs are cooking your fresh meal.',
      icon: ChefHat,
    },
    {
      key: 'Ready',
      title: 'Packed & Ready',
      desc: 'Hot and sealed in insulated hygienic packaging.',
      icon: PackageCheck,
    },
    {
      key: 'Out for Delivery',
      title: 'Out for Delivery',
      desc: 'Our delivery rider is cruising to your location.',
      icon: Bike,
    },
    {
      key: 'Delivered',
      title: 'Delivered',
      desc: 'Enjoy your delicious feast from Kitchen Cruze!',
      icon: CheckCircle,
    },
  ];

  const pickupSteps: Array<{ key: OrderStatus; title: string; desc: string; icon: any }> = [
    {
      key: 'Order Received',
      title: 'Order Received',
      desc: 'We have received your pickup request.',
      icon: Clock,
    },
    {
      key: 'Confirmed',
      title: 'Confirmed',
      desc: 'Kitchen Cruze has verified your order.',
      icon: CheckCircle2,
    },
    {
      key: 'Preparing',
      title: 'Preparing Food',
      desc: 'Chefs are preparing your meal fresh.',
      icon: ChefHat,
    },
    {
      key: 'Ready for Pickup',
      title: 'Ready for Pickup',
      desc: 'Please head over to the counter to collect.',
      icon: Store,
    },
    {
      key: 'Picked Up',
      title: 'Order Picked Up',
      desc: 'Order collected. Bon appétit!',
      icon: CheckCircle,
    },
  ];

  const steps = orderType === 'Pickup' ? pickupSteps : deliverySteps;
  const currentStepIndex = steps.findIndex((s) => s.key === status);
  const isCancelled = status === 'Cancelled';

  if (isCancelled) {
    return (
      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-3">
        <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
        <div>
          <h4 className="font-bold text-sm">Order Cancelled</h4>
          <p className="text-xs text-rose-700 mt-0.5">
            This order has been cancelled. Please contact restaurant support if you need assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="order-status-timeline" className="py-2">
      <div className="relative pl-6 sm:pl-8 space-y-6">
        {/* Connecting line */}
        <div className="absolute left-[15px] sm:left-[19px] top-3 bottom-3 w-0.5 bg-slate-200" />

        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isDone = currentStepIndex >= 0 && idx < currentStepIndex;
          const isCurrent = currentStepIndex >= 0 && idx === currentStepIndex;
          const isUpcoming = currentStepIndex >= 0 && idx > currentStepIndex;

          return (
            <div key={step.key} className="relative flex items-start space-x-4">
              {/* Step indicator node */}
              <div
                className={`absolute -left-[27px] sm:-left-[31px] w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                  isDone
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                    : isCurrent
                    ? 'bg-amber-500 border-amber-500 text-white shadow-md ring-4 ring-amber-500/20'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCurrent ? 'animate-pulse' : ''}`} />
              </div>

              {/* Step text */}
              <div className="pt-0.5">
                <div className="flex items-center space-x-2">
                  <h4
                    className={`text-sm font-bold leading-tight ${
                      isCurrent
                        ? 'text-amber-600 font-extrabold'
                        : isDone
                        ? 'text-slate-900'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </h4>
                  {isCurrent && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                      In Progress
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[11px] text-emerald-600 font-medium">Completed</span>
                  )}
                </div>

                <p
                  className={`text-xs mt-0.5 ${
                    isCurrent || isDone ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {step.desc}
                </p>

                {isCurrent && updatedAt && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Last updated: {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
